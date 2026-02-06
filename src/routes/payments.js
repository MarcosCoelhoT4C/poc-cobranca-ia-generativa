const { Router } = require('express');
const { authenticate, requireScope } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const analyticsService = require('../services/analyticsService');

const router = Router();

/**
 * POST /api/v1/payments/process
 * Process a payment proposal.
 */
router.post(
  '/process',
  authenticate,
  requireScope('conversations:write'),
  (req, res) => {
    const { conversation_id, payment_proposal, customer_confirmation } = req.body;

    if (!conversation_id || !payment_proposal) {
      return res.status(400).json({
        status: 'error',
        message: 'conversation_id e payment_proposal são obrigatórios',
        code: 'VALIDATION_ERROR',
      });
    }

    try {
      const result = paymentService.createPayment({
        conversation_id,
        payment_proposal,
        customer_confirmation,
      });

      // Track analytics events
      analyticsService.paymentProposed({
        conversation_id,
        amount: payment_proposal.total_amount,
        discount: payment_proposal.discount_applied || 0,
      });

      analyticsService.paymentConfirmed({
        conversation_id,
        amount: payment_proposal.total_amount,
      });

      res.status(200).json(result);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        status: 'error',
        message: err.message,
        code: 'PAYMENT_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/payments
 * List all payments.
 */
router.get(
  '/',
  authenticate,
  requireScope('analytics:read'),
  (_req, res) => {
    const payments = paymentService.listPayments();
    res.json({ status: 'success', data: payments, total: payments.length });
  }
);

/**
 * GET /api/v1/payments/:id
 * Get payment details.
 */
router.get(
  '/:id',
  authenticate,
  requireScope('analytics:read'),
  (req, res) => {
    const payment = paymentService.getPayment(req.params.id);
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Pagamento não encontrado',
        code: 'NOT_FOUND',
      });
    }
    res.json({ status: 'success', data: payment.toJSON() });
  }
);

module.exports = router;
