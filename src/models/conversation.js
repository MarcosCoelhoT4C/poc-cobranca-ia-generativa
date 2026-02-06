const { v4: uuidv4 } = require('uuid');

class Conversation {
  constructor({ customer_id, channel, conversation_context, ai_configuration }) {
    this.conversation_id = `conv_${uuidv4().slice(0, 8)}`;
    this.customer_id = customer_id;
    this.channel = channel || 'whatsapp';
    this.context = conversation_context || {};
    this.ai_config = ai_configuration || {};
    this.status = 'active';
    this.messages = [];
    this.intent_scores = {};
    this.ai_confidence = 0;
    this.escalation_triggers = [
      'customer_expresses_difficulty',
      'no_response_after_3_attempts',
      'customer_requests_human_agent',
    ];
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  addMessage(role, content, metadata = {}) {
    this.messages.push({
      role,
      content,
      metadata,
      timestamp: new Date().toISOString(),
    });
    this.updated_at = new Date().toISOString();
  }

  toJSON() {
    return {
      conversation_id: this.conversation_id,
      customer_id: this.customer_id,
      channel: this.channel,
      status: this.status,
      messages_count: this.messages.length,
      ai_confidence: this.ai_confidence,
      intent_scores: this.intent_scores,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Conversation;
