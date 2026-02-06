/**
 * Payment Processing Service
 */
const Payment = require('../models/payment');
const store = require('../store');

class PaymentService {
  createPayment({ conversation_id, payment_proposal, customer_confirmation }) {
    const conversation = store.conversations.get(conversation_id);
    if (!conversation) {
      const err = new Error('Conversa não encontrada');
      err.statusCode = 404;
      throw err;
    }

    const payment = new Payment({ conversation_id, payment_proposal, customer_confirmation });
    store.payments.set(payment.payment_request_id, payment);

    // Update metrics
    store.metrics.totalRecoveryAmount += payment.total_amount;
    store.metrics.successfulPayments++;
    const channel = conversation.channel || 'whatsapp';
    if (store.metrics.paymentsByChannel[channel] !== undefined) {
      store.metrics.paymentsByChannel[channel]++;
      store.metrics.recoveryByChannel[channel] += payment.total_amount;
    }

    // Track segment
    const customer = store.customers.get(conversation.customer_id);
    if (customer) {
      const segment = customer.segment;
      if (store.metrics.segmentStats[segment]) {
        store.metrics.segmentStats[segment].successes++;
      }
    }

    const expectedConfirmation = new Date();
    expectedConfirmation.setHours(expectedConfirmation.getHours() + 1);

    return {
      status: 'success',
      payment_request_id: payment.payment_request_id,
      pix_key: payment.pix_key,
      pix_code: payment.pix_code,
      qr_code_url: payment.qr_code_url,
      payment_timeout: payment.payment_timeout,
      webhook_url: payment.webhook_url,
      expected_confirmation_time: expectedConfirmation.toISOString(),
    };
  }

  getPayment(paymentId) {
    return store.payments.get(paymentId);
  }

  listPayments() {
    return Array.from(store.payments.values()).map((p) => p.toJSON());
  }
}

module.exports = new PaymentService();
