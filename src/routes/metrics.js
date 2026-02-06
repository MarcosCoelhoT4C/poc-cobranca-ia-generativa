const { Router } = require('express');
const { authenticate, requireScope } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

const router = Router();

/**
 * GET /api/v1/metrics/realtime
 * Get real-time metrics dashboard data.
 */
router.get(
  '/realtime',
  authenticate,
  requireScope('analytics:read'),
  (req, res) => {
    const timeframe = req.query.timeframe || '1h';
    const administratorId = req.query.administrator_id || req.user.administrator_id;
    const metrics = analyticsService.getRealtimeMetrics(timeframe, administratorId);
    res.json(metrics);
  }
);

/**
 * GET /api/v1/metrics/events
 * Get recent analytics events.
 */
router.get(
  '/events',
  authenticate,
  requireScope('analytics:read'),
  (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    const store = require('../store');
    const events = store.events.slice(-limit);
    res.json({ status: 'success', data: events, total: events.length });
  }
);

module.exports = router;
