const { Router } = require('express');
const store = require('../store');

const router = Router();

/**
 * GET /health - Liveness probe
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

/**
 * GET /ready - Readiness probe
 */
router.get('/ready', (_req, res) => {
  const isReady = store !== null;
  if (isReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        store: 'ok',
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
    });
  } else {
    res.status(503).json({ status: 'not_ready' });
  }
});

module.exports = router;
