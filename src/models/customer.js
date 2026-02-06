const { v4: uuidv4 } = require('uuid');

class Customer {
  constructor(data) {
    this.customer_id = data.customer_id || `cust_${uuidv4().slice(0, 8)}`;
    this.document = data.document;
    this.name = data.name;
    this.phone = data.phone;
    this.email = data.email;
    this.consortium_id = data.consortium_id;
    this.overdue_amount = data.overdue_amount || 0;
    this.overdue_days = data.overdue_days || 0;
    this.installments_overdue = data.installments_overdue || 0;
    this.total_consortium_value = data.total_consortium_value || 0;
    this.last_payment_date = data.last_payment_date;
    this.payment_history_score = data.payment_history_score || 0.5;
    this.risk_segment = data.risk_segment || 'medium';
    this.portfolio_id = data.portfolio_id;
    this.profile = data.customer_profile || this._inferProfile(data);
    this.created_at = new Date().toISOString();
  }

  _inferProfile(data) {
    const age = data.age || 35;
    let income_bracket = 'middle';
    if (data.total_consortium_value > 150000) income_bracket = 'high';
    else if (data.total_consortium_value < 50000) income_bracket = 'low';

    let payment_behavior = 'inconsistent';
    if (data.payment_history_score >= 0.7) payment_behavior = 'consistent';
    else if (data.payment_history_score >= 0.4) payment_behavior = 'moderate';

    return {
      age,
      income_bracket,
      income_level: income_bracket,
      payment_behavior,
      preferred_language: 'pt-BR',
    };
  }

  get segment() {
    if (this.overdue_amount > 5000 || this.overdue_days > 90) return 'high_priority';
    if (this.overdue_amount > 1000 || this.overdue_days > 30) return 'medium_priority';
    return 'low_priority';
  }

  toJSON() {
    return {
      customer_id: this.customer_id,
      name: this.name,
      consortium_id: this.consortium_id,
      overdue_amount: this.overdue_amount,
      overdue_days: this.overdue_days,
      installments_overdue: this.installments_overdue,
      payment_history_score: this.payment_history_score,
      risk_segment: this.risk_segment,
      segment: this.segment,
      profile: this.profile,
    };
  }
}

module.exports = Customer;
