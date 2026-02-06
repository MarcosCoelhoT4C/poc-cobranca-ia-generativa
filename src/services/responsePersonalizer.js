/**
 * Response Personalizer Service
 * Adapts AI responses based on customer profile and intent scores.
 */
class ResponsePersonalizer {
  constructor() {
    this.personalityMatrix = {
      young_professional: {
        language_style: 'casual_direct',
        payment_emphasis: 'convenience',
        urgency_level: 'medium',
        discount_approach: 'gradual_concessions',
      },
      middle_aged: {
        language_style: 'respectful_formal',
        payment_emphasis: 'family_responsibility',
        urgency_level: 'medium',
        discount_approach: 'fair_consideration',
      },
      senior_citizen: {
        language_style: 'patient_respectful',
        payment_emphasis: 'legacy_planning',
        urgency_level: 'low',
        discount_approach: 'generous_accommodation',
      },
      financial_stress: {
        language_style: 'empathetic_supportive',
        payment_emphasis: 'flexibility',
        urgency_level: 'very_low',
        discount_approach: 'significant_concessions',
      },
    };

    this.greetingTemplates = {
      young_professional: [
        'Oi {name}! Tudo bem? Vi que tem uma pendência de R$ {amount} no consórcio. Bora resolver isso rapidinho? Tenho umas opções que vão facilitar pra você!',
        'E aí {name}! Passando pra falar sobre sua parcela de R$ {amount}. Tenho umas condições especiais que acho que vão te interessar!',
      ],
      middle_aged: [
        'Olá {name}! Vi que você tem uma pendência no seu consórcio de R$ {amount}. Posso te ajudar a encontrar uma solução que funcione no seu bolso?',
        'Bom dia {name}! Vim conversar sobre sua pendência do consórcio para encontrarmos uma saída juntos. Temos algumas opções que podem te ajudar!',
      ],
      senior_citizen: [
        'Bom dia {name}! Com licença, gostaria de conversar sobre sua parcela do consórcio. Temos condições muito especiais que podem te ajudar a regularizar. Posso explicar?',
        'Olá {name}! Espero que esteja bem. Estou entrando em contato sobre seu consórcio. Gostaria de apresentar algumas opções flexíveis de pagamento, posso?',
      ],
      financial_stress: [
        'Olá {name}, tudo bem? Entendo que momentos difíceis acontecem. Estou aqui pra te ajudar a encontrar um caminho viável pra regularizar sua situação. Sem pressão, vamos conversar?',
        'Oi {name}! Sei que a situação pode estar complicada. Quero te ajudar a resolver isso da melhor forma possível. Temos opções bem flexíveis, posso explicar?',
      ],
    };
  }

  determineCluster(profile, intentScores) {
    const age = profile?.age || 35;
    const incomeLevel = profile?.income_level || profile?.income_bracket || 'middle';
    const financialCapacity = intentScores?.financial_capacity?.score || 0.5;

    if (financialCapacity < 0.3) return 'financial_stress';
    if (age < 35 && (incomeLevel === 'high' || incomeLevel === 'middle')) return 'young_professional';
    if (age >= 55) return 'senior_citizen';
    return 'middle_aged';
  }

  generateGreeting(customer, intentScores = {}) {
    const cluster = this.determineCluster(customer.profile, intentScores);
    const templates = this.greetingTemplates[cluster];
    const template = templates[Math.floor(Math.random() * templates.length)];

    const firstName = (customer.name || 'Cliente').split(' ')[0];
    const amount = (customer.overdue_amount || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
    });

    return template.replace('{name}', firstName).replace('{amount}', amount);
  }

  generatePaymentOptions(customer) {
    const amount = customer.overdue_amount || 0;
    const cluster = this.determineCluster(customer.profile, {});
    const personality = this.personalityMatrix[cluster];
    const options = [];

    // Option 1: Full payment with discount
    let discountPct = 5;
    if (personality.discount_approach === 'generous_accommodation') discountPct = 15;
    else if (personality.discount_approach === 'significant_concessions') discountPct = 12;
    else if (personality.discount_approach === 'fair_consideration') discountPct = 8;

    const discountedAmount = amount * (1 - discountPct / 100);
    options.push({
      type: 'full_payment',
      description: `Pagamento à vista com ${discountPct}% de desconto`,
      amount: Math.round(discountedAmount * 100) / 100,
      discount_percentage: discountPct,
    });

    // Option 2: 3x installments
    const installment3 = Math.round((amount / 3) * 100) / 100;
    options.push({
      type: 'installment_3x',
      description: `Parcelamento em 3x de R$ ${installment3.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      amount,
      installments: 3,
      installment_value: installment3,
    });

    // Option 3: 6x installments with small addition
    const total6 = amount * 1.05;
    const installment6 = Math.round((total6 / 6) * 100) / 100;
    options.push({
      type: 'installment_6x',
      description: `Parcelamento em 6x de R$ ${installment6.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      amount: Math.round(total6 * 100) / 100,
      installments: 6,
      installment_value: installment6,
    });

    return options;
  }

  personalize(baseResponse, customer, intentScores) {
    const cluster = this.determineCluster(customer.profile, intentScores);
    const personality = this.personalityMatrix[cluster];
    return {
      message: baseResponse,
      personality_cluster: cluster,
      personality_settings: personality,
      payment_options: this.generatePaymentOptions(customer),
    };
  }
}

module.exports = new ResponsePersonalizer();
