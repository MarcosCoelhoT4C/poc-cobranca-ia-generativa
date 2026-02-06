const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class Payment {
  constructor({ conversation_id, payment_proposal, customer_confirmation }) {
    this.payment_request_id = `pay_req_${uuidv4().slice(0, 8)}`;
    this.conversation_id = conversation_id;
    this.total_amount = payment_proposal?.total_amount || 0;
    this.payment_method = payment_proposal?.payment_method || 'pix';
    this.payment_option = payment_proposal?.payment_option || 'full_amount';
    this.discount_applied = payment_proposal?.discount_applied || 0;
    this.due_date = payment_proposal?.due_date || this._defaultDueDate();
    this.confirmation_method = customer_confirmation?.method || 'text_confirmation';
    this.confidence_threshold = customer_confirmation?.confidence_threshold || 0.85;
    this.status = 'pending';
    this.pix_key = config.pixKey;
    this.pix_code = this._generatePixCode();
    this.qr_code_url = `https://api.consorciei.com.br/qr/${this.payment_request_id}.png`;
    this.payment_timeout = 3600;
    this.webhook_url = 'https://client.consorciei.com.br/webhook/payment';
    this.created_at = new Date().toISOString();
  }

  _defaultDueDate() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  }

  _generatePixCode() {
    const amount = this.total_amount.toFixed(2).replace('.', '');
    return `00020126580014BR.GOV.BCB.PIX0136${this.pix_key}52040000530398654${amount}`;
  }

  toJSON() {
    return {
      payment_request_id: this.payment_request_id,
      conversation_id: this.conversation_id,
      total_amount: this.total_amount,
      payment_method: this.payment_method,
      payment_option: this.payment_option,
      discount_applied: this.discount_applied,
      due_date: this.due_date,
      status: this.status,
      pix_key: this.pix_key,
      pix_code: this.pix_code,
      qr_code_url: this.qr_code_url,
      payment_timeout: this.payment_timeout,
      webhook_url: this.webhook_url,
      created_at: this.created_at,
    };
  }
}

module.exports = Payment;
