/**
 * In-memory data store for the POC.
 * In production, this would be PostgreSQL + Redis.
 */

const store = {
  portfolios: new Map(),
  customers: new Map(),
  conversations: new Map(),
  payments: new Map(),
  events: [],
  metrics: {
    totalConversations: 0,
    successfulPayments: 0,
    totalRecoveryAmount: 0,
    conversationsByChannel: { whatsapp: 0, sms: 0, email: 0 },
    paymentsByChannel: { whatsapp: 0, sms: 0, email: 0 },
    recoveryByChannel: { whatsapp: 0, sms: 0, email: 0 },
    segmentStats: {
      high_priority: { count: 0, successes: 0 },
      medium_priority: { count: 0, successes: 0 },
      low_priority: { count: 0, successes: 0 },
    },
  },
};

module.exports = store;
