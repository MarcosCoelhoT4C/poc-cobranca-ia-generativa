const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolios');
const conversationRoutes = require('./routes/conversations');
const paymentRoutes = require('./routes/payments');
const metricsRoutes = require('./routes/metrics');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static files (dashboard)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health probes (no auth required)
app.use(healthRoutes);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/portfolios', portfolioRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/metrics', metricsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     POC Cobrança com IA Generativa - API Server         ║
╠══════════════════════════════════════════════════════════╣
║  Status:  Running                                        ║
║  Port:    ${String(config.port).padEnd(47)}║
║  Env:     ${config.nodeEnv.padEnd(47)}║
║  Docs:    http://localhost:${config.port}/                         ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║    POST /api/v1/auth/token         - Get JWT token       ║
║    POST /api/v1/portfolios/ingest  - Import portfolios   ║
║    POST /api/v1/conversations/start- Start conversation  ║
║    POST /api/v1/payments/process   - Process payment     ║
║    GET  /api/v1/metrics/realtime   - Real-time metrics   ║
║    GET  /health                    - Liveness probe      ║
║    GET  /ready                     - Readiness probe     ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
