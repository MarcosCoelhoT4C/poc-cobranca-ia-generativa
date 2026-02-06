/**
 * Intent Classifier Service
 * Rule-based intent classification for the POC (simulates BERT + business rules).
 * In production, this would call the Python BERT model.
 */
class IntentClassifier {
  constructor() {
    this.intentPatterns = {
      payment_willingness: {
        high: [/posso pagar/i, /tenho interesse/i, /como faço/i, /quero pagar/i, /vou pagar/i, /pode enviar/i, /manda.*pix/i],
        medium: [/mais tarde/i, /verifico/i, /chamo depois/i, /preciso pensar/i, /vou ver/i, /talvez/i],
        low: [/não tenho dinheiro/i, /impossível/i, /não vou pagar/i, /não posso/i, /sem condição/i],
      },
      emotional_state: {
        stressed: [/estou.*apertado/i, /situação difícil/i, /perdi.*emprego/i, /problema/i, /desespero/i, /não sei o que fazer/i],
        cooperative: [/podemos resolver/i, /entendo.*situação/i, /ajuda/i, /vamos.*negociar/i, /quero resolver/i],
        resistant: [/não quero falar/i, /me deixe em paz/i, /não interessa/i, /para.*ligar/i, /não me incomode/i],
      },
      financial_capacity: {
        high: [/tenho.*dinheiro/i, /posso pagar.*tudo/i, /já resolvo/i, /à vista/i, /pago.*integral/i],
        medium: [/pequeno valor/i, /consigo.*alguma coisa/i, /parte.*valor/i, /parcela/i, /dividir/i],
        low: [/zero.*dinheiro/i, /não tenho nada/i, /situação crítica/i, /sem renda/i, /desempregado/i],
      },
    };
  }

  classify(message, conversationHistory = '') {
    const currentMsg = message.toLowerCase();
    const fullContext = `${conversationHistory}\n${message}`.toLowerCase();
    const scores = {};

    for (const [category, levels] of Object.entries(this.intentPatterns)) {
      let matchedLevel = 'medium';
      let maxScore = 0.5;

      // Prioritize matching against current message first
      for (const source of [currentMsg, fullContext]) {
        for (const [level, patterns] of Object.entries(levels)) {
          for (const pattern of patterns) {
            if (pattern.test(source)) {
              const levelScore = level === 'high' || level === 'cooperative' ? 0.85
                : level === 'medium' || level === 'stressed' ? 0.55
                : 0.2;
              if (Math.abs(levelScore - 0.5) > Math.abs(maxScore - 0.5)) {
                maxScore = levelScore;
                matchedLevel = level;
              }
            }
          }
        }
        // If we found a match in the current message, use it (don't let history override)
        if (maxScore !== 0.5) break;
      }

      scores[category] = { score: maxScore, level: matchedLevel };
    }

    return {
      scores,
      strategy: this._generateStrategy(scores),
      confidence: this._calculateConfidence(scores),
    };
  }

  _generateStrategy(scores) {
    const willingness = scores.payment_willingness?.score || 0.5;
    const capacity = scores.financial_capacity?.score || 0.5;
    const emotionalLevel = scores.emotional_state?.level || 'cooperative';

    if (willingness >= 0.7 && capacity >= 0.7) {
      return 'close_deal';
    }
    if (willingness >= 0.7 && capacity < 0.5) {
      return 'offer_installments';
    }
    if (emotionalLevel === 'stressed') {
      return 'empathetic_support';
    }
    if (emotionalLevel === 'resistant') {
      return 'soft_approach';
    }
    if (willingness < 0.3) {
      return 'build_rapport';
    }
    return 'present_options';
  }

  _calculateConfidence(scores) {
    const values = Object.values(scores).map((s) => Math.abs(s.score - 0.5));
    const avgDeviation = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round((0.5 + avgDeviation) * 100) / 100;
  }
}

module.exports = new IntentClassifier();
