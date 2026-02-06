const { Router } = require('express');
const { authenticate, requireScope } = require('../middleware/auth');
const Conversation = require('../models/conversation');
const store = require('../store');
const aiService = require('../services/aiService');
const analyticsService = require('../services/analyticsService');

const router = Router();

/**
 * POST /api/v1/conversations/start
 * Start a new AI-powered conversation with a customer.
 */
router.post(
  '/start',
  authenticate,
  requireScope('conversations:write'),
  (req, res) => {
    const { customer_id, channel, conversation_context, ai_configuration } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        status: 'error',
        message: 'customer_id é obrigatório',
        code: 'VALIDATION_ERROR',
      });
    }

    const customer = store.customers.get(customer_id);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Cliente não encontrado. Importe uma carteira primeiro.',
        code: 'CUSTOMER_NOT_FOUND',
      });
    }

    const conversation = new Conversation({
      customer_id,
      channel,
      conversation_context: {
        overdue_amount: customer.overdue_amount,
        customer_segment: customer.segment,
        ...conversation_context,
        customer_profile: customer.profile,
      },
      ai_configuration,
    });

    // Generate initial AI message
    const aiResult = aiService.generateInitialMessage(customer);
    conversation.addMessage('assistant', aiResult.message, {
      ai_confidence: aiResult.ai_confidence,
      strategy: aiResult.strategy,
    });
    conversation.ai_confidence = aiResult.ai_confidence;
    conversation.intent_scores = aiResult.intent_scores;

    store.conversations.set(conversation.conversation_id, conversation);

    // Update metrics
    store.metrics.totalConversations++;
    const ch = channel || 'whatsapp';
    if (store.metrics.conversationsByChannel[ch] !== undefined) {
      store.metrics.conversationsByChannel[ch]++;
    }
    const segment = customer.segment;
    if (store.metrics.segmentStats[segment]) {
      store.metrics.segmentStats[segment].count++;
    }

    // Track event
    analyticsService.conversationStarted({
      conversation_id: conversation.conversation_id,
      customer_id,
      channel: ch,
      ai_confidence: aiResult.ai_confidence,
    });

    res.status(200).json({
      status: 'success',
      conversation_id: conversation.conversation_id,
      initial_message: aiResult.message,
      ai_confidence: aiResult.ai_confidence,
      estimated_success_rate: aiResult.estimated_success_rate,
      next_action: 'await_customer_response',
      escalation_triggers: conversation.escalation_triggers,
    });
  }
);

/**
 * POST /api/v1/conversations/:id/message
 * Send a customer message and get AI response.
 */
router.post(
  '/:id/message',
  authenticate,
  requireScope('conversations:write'),
  (req, res) => {
    const conversation = store.conversations.get(req.params.id);
    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversa não encontrada',
        code: 'NOT_FOUND',
      });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'message é obrigatório',
        code: 'VALIDATION_ERROR',
      });
    }

    const customer = store.customers.get(conversation.customer_id);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Cliente não encontrado',
        code: 'CUSTOMER_NOT_FOUND',
      });
    }

    // Add customer message
    conversation.addMessage('customer', message);

    // Build conversation history
    const history = conversation.messages.map((m) => `${m.role}: ${m.content}`).join('\n');

    // Process with AI
    const aiResult = aiService.processMessage(message, customer, history);
    conversation.addMessage('assistant', aiResult.message, {
      ai_confidence: aiResult.ai_confidence,
      strategy: aiResult.strategy,
      intent_scores: aiResult.intent_scores,
    });
    conversation.ai_confidence = aiResult.ai_confidence;
    conversation.intent_scores = aiResult.intent_scores;

    const responseData = {
      status: 'success',
      conversation_id: conversation.conversation_id,
      ai_response: aiResult.message,
      ai_confidence: aiResult.ai_confidence,
      intent_scores: aiResult.intent_scores,
      strategy: aiResult.strategy,
      personality_cluster: aiResult.personality_cluster,
      payment_options: aiResult.payment_options,
      next_action: aiResult.should_escalate ? 'escalate_to_human' : 'await_customer_response',
    };

    res.json(responseData);
  }
);

/**
 * GET /api/v1/conversations/:id
 * Get conversation details.
 */
router.get(
  '/:id',
  authenticate,
  requireScope('conversations:write'),
  (req, res) => {
    const conversation = store.conversations.get(req.params.id);
    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversa não encontrada',
        code: 'NOT_FOUND',
      });
    }
    res.json({
      status: 'success',
      data: {
        ...conversation.toJSON(),
        messages: conversation.messages,
      },
    });
  }
);

/**
 * GET /api/v1/conversations
 * List all conversations.
 */
router.get(
  '/',
  authenticate,
  requireScope('conversations:write'),
  (_req, res) => {
    const conversations = Array.from(store.conversations.values()).map((c) => c.toJSON());
    res.json({ status: 'success', data: conversations, total: conversations.length });
  }
);

module.exports = router;
