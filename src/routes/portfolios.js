const { Router } = require('express');
const { authenticate, requireScope } = require('../middleware/auth');
const Portfolio = require('../models/portfolio');
const Customer = require('../models/customer');
const store = require('../store');
const encryptionService = require('../services/encryptionService');

const router = Router();

/**
 * POST /api/v1/portfolios/ingest
 * Import a customer debt portfolio.
 */
router.post(
  '/ingest',
  authenticate,
  requireScope('portfolios:write'),
  (req, res) => {
    const { administrator_id, portfolio_type, data_source, customer_data, business_rules } = req.body;

    if (!customer_data || !Array.isArray(customer_data) || customer_data.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'customer_data é obrigatório e deve ser um array não vazio',
        code: 'VALIDATION_ERROR',
      });
    }

    const startTime = Date.now();

    const portfolio = new Portfolio({
      administrator_id: administrator_id || req.user.administrator_id,
      portfolio_type,
      data_source,
      business_rules,
      customer_data,
    });

    store.portfolios.set(portfolio.portfolio_id, portfolio);

    // Import customers
    for (const data of customer_data) {
      const customer = new Customer({ ...data, portfolio_id: portfolio.portfolio_id });

      // Encrypt PII before storing
      if (data.document) customer._encrypted_document = encryptionService.encryptPII(data.document, 'cpf');
      if (data.phone) customer._encrypted_phone = encryptionService.encryptPII(data.phone, 'phone');
      if (data.email) customer._hashed_email = encryptionService.encryptPII(data.email, 'email');

      store.customers.set(customer.customer_id, customer);
    }

    portfolio.status = 'completed';
    const processingTime = Date.now() - startTime;

    res.status(200).json({
      status: 'success',
      portfolio_id: portfolio.portfolio_id,
      customers_imported: portfolio.customers_imported,
      processing_time_ms: processingTime,
      estimated_revenue: portfolio.estimated_revenue,
      next_steps: [
        'Data validation complete',
        'ML scoring initiated',
        'Contact orchestration starting in 15 minutes',
      ],
    });
  }
);

/**
 * GET /api/v1/portfolios
 * List all portfolios.
 */
router.get(
  '/',
  authenticate,
  requireScope('portfolios:read'),
  (_req, res) => {
    const portfolios = Array.from(store.portfolios.values()).map((p) => p.toJSON());
    res.json({ status: 'success', data: portfolios, total: portfolios.length });
  }
);

/**
 * GET /api/v1/portfolios/:id
 * Get a specific portfolio.
 */
router.get(
  '/:id',
  authenticate,
  requireScope('portfolios:read'),
  (req, res) => {
    const portfolio = store.portfolios.get(req.params.id);
    if (!portfolio) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio não encontrado',
        code: 'NOT_FOUND',
      });
    }

    // Get associated customers
    const customers = Array.from(store.customers.values())
      .filter((c) => c.portfolio_id === req.params.id)
      .map((c) => c.toJSON());

    res.json({ status: 'success', data: { ...portfolio.toJSON(), customers } });
  }
);

module.exports = router;
