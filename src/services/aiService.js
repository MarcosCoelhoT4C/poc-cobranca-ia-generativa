/**
 * AI Service
 * Orchestrates the conversation flow using intent classification and response personalization.
 * In production, this would integrate with OpenAI GPT-4 Turbo.
 */
const intentClassifier = require('./intentClassifier');
const responsePersonalizer = require('./responsePersonalizer');

class AIService {
  constructor() {
    this.systemPrompt = {
      role: 'Você é um assistente de cobrança especializado da Consorciei',
      objectives: [
        'Ajudar clientes a regularizar dívidas de consórcio',
        'Manter tom empático e profissional',
        'Oferecer soluções personalizadas',
        'Escalar para humanos quando necessário',
      ],
      constraints: [
        'Nunca ser agressivo ou intimidante',
        'Sempre oferecer pelo menos 3 opções de pagamento',
        'Respeitar limites de desconto estabelecidos',
        'Detectar sinais de dificuldade financeira',
      ],
    };

    this.responseStrategies = {
      close_deal: (customer) => {
        const options = responsePersonalizer.generatePaymentOptions(customer);
        const firstName = customer.name?.split(' ')[0] || 'Cliente';
        return `Ótimo, ${firstName}! Fico feliz que queira resolver. Aqui estão suas opções:\n\n` +
          `1. ${options[0].description} - R$ ${options[0].amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `2. ${options[1].description}\n` +
          `3. ${options[2].description}\n\n` +
          `Qual opção prefere?`;
      },
      offer_installments: (customer) => {
        const firstName = customer.name?.split(' ')[0] || 'Cliente';
        const options = responsePersonalizer.generatePaymentOptions(customer);
        return `Entendo, ${firstName}. Temos opções flexíveis de parcelamento:\n\n` +
          `1. ${options[1].description}\n` +
          `2. ${options[2].description}\n` +
          `Qual se encaixa melhor no seu orçamento?`;
      },
      empathetic_support: (customer) => {
        const firstName = customer.name?.split(' ')[0] || 'Cliente';
        return `${firstName}, entendo que está passando por um momento difícil. ` +
          `Estou aqui pra te ajudar sem pressão. Podemos encontrar uma solução que funcione pra você. ` +
          `Que tal começarmos com um valor menor e ajustamos conforme sua situação melhorar?`;
      },
      soft_approach: (customer) => {
        const firstName = customer.name?.split(' ')[0] || 'Cliente';
        return `${firstName}, respeito seu espaço. Só quero que saiba que temos condições especiais ` +
          `disponíveis por tempo limitado que podem te ajudar. Quando quiser conversar, estou à disposição.`;
      },
      build_rapport: (customer) => {
        const firstName = customer.name?.split(' ')[0] || 'Cliente';
        return `${firstName}, entendo que isso pode não ser prioridade agora. ` +
          `Mas resolver essa pendência pode evitar complicações futuras no seu consórcio. ` +
          `Posso te mostrar algumas opções que podem facilitar?`;
      },
      present_options: (customer) => {
        const firstName = customer.name?.split(' ')[0] || 'Cliente';
        const options = responsePersonalizer.generatePaymentOptions(customer);
        return `${firstName}, separei 3 opções pra você:\n\n` +
          `1. ${options[0].description}\n` +
          `2. ${options[1].description}\n` +
          `3. ${options[2].description}\n\n` +
          `Alguma dessas funciona pra você?`;
      },
    };
  }

  generateInitialMessage(customer) {
    const greeting = responsePersonalizer.generateGreeting(customer);
    const intentResult = intentClassifier.classify('', '');
    const confidence = 0.85 + Math.random() * 0.1;
    const successRate = this._estimateSuccessRate(customer);

    return {
      message: greeting,
      ai_confidence: Math.round(confidence * 100) / 100,
      estimated_success_rate: successRate,
      intent_scores: intentResult.scores,
      strategy: 'initial_greeting',
    };
  }

  processMessage(message, customer, conversationHistory = '') {
    const intentResult = intentClassifier.classify(message, conversationHistory);
    const strategyFn = this.responseStrategies[intentResult.strategy] || this.responseStrategies.present_options;
    const response = strategyFn(customer);
    const personalized = responsePersonalizer.personalize(response, customer, intentResult.scores);

    return {
      message: personalized.message,
      intent_scores: intentResult.scores,
      strategy: intentResult.strategy,
      ai_confidence: intentResult.confidence,
      personality_cluster: personalized.personality_cluster,
      payment_options: personalized.payment_options,
      should_escalate: this._checkEscalation(intentResult),
    };
  }

  _estimateSuccessRate(customer) {
    let rate = 0.5;
    if (customer.payment_history_score >= 0.7) rate += 0.15;
    if (customer.overdue_days < 30) rate += 0.1;
    if (customer.overdue_days > 90) rate -= 0.15;
    if (customer.risk_segment === 'low') rate += 0.05;
    if (customer.risk_segment === 'high') rate -= 0.1;
    return Math.round(Math.max(0.1, Math.min(0.95, rate)) * 100) / 100;
  }

  _checkEscalation(intentResult) {
    const emotional = intentResult.scores?.emotional_state;
    if (emotional?.level === 'resistant' && emotional?.score < 0.3) return true;
    return false;
  }
}

module.exports = new AIService();
