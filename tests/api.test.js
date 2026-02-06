const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3001';
const TOKEN = 'dev-token';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

let server;
let portfolioId;
let conversationId;
let paymentId;

async function api(method, path, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return { status: res.status, data: await res.json() };
}

before(async () => {
  const app = require('../src/index');
  server = app.listen(3001);
  await new Promise((r) => setTimeout(r, 500));
});

after(() => {
  if (server) server.close();
});

describe('Health endpoints', () => {
  it('GET /health returns healthy', async () => {
    const { status, data } = await api('GET', '/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'healthy');
    assert.ok(data.uptime > 0);
  });

  it('GET /ready returns ready', async () => {
    const { status, data } = await api('GET', '/ready');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'ready');
  });
});

describe('Authentication', () => {
  it('POST /api/v1/auth/token returns JWT', async () => {
    const { status, data } = await api('POST', '/api/v1/auth/token', {
      username: 'admin',
      password: 'test123',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.access_token);
    assert.strictEqual(data.token_type, 'Bearer');
  });

  it('rejects requests without token', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/portfolios`, {
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(res.status, 401);
  });
});

describe('Portfolio ingestion', () => {
  it('POST /api/v1/portfolios/ingest creates portfolio', async () => {
    const { status, data } = await api('POST', '/api/v1/portfolios/ingest', {
      administrator_id: 'admin_12345',
      portfolio_type: 'overdue_1_3_months',
      customer_data: [
        {
          customer_id: 'cust_t1',
          document: '12345678901',
          name: 'Test Customer 1',
          phone: '+5511999000111',
          email: 'test1@email.com',
          overdue_amount: 2450.75,
          overdue_days: 45,
          payment_history_score: 0.75,
          risk_segment: 'medium',
          total_consortium_value: 85000,
        },
        {
          customer_id: 'cust_t2',
          document: '98765432100',
          name: 'Test Customer 2',
          phone: '+5521988000222',
          email: 'test2@email.com',
          overdue_amount: 5200.0,
          overdue_days: 92,
          payment_history_score: 0.45,
          risk_segment: 'high',
          total_consortium_value: 120000,
        },
      ],
      business_rules: {
        max_discount_percentage: 15,
        min_installment_value: 100,
      },
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.portfolio_id.startsWith('port_'));
    assert.strictEqual(data.customers_imported, 2);
    assert.ok(data.estimated_revenue > 0);
    assert.ok(Array.isArray(data.next_steps));
    portfolioId = data.portfolio_id;
  });

  it('GET /api/v1/portfolios lists portfolios', async () => {
    const { status, data } = await api('GET', '/api/v1/portfolios');
    assert.strictEqual(status, 200);
    assert.ok(data.total > 0);
  });

  it('GET /api/v1/portfolios/:id returns portfolio with customers', async () => {
    const { status, data } = await api('GET', `/api/v1/portfolios/${portfolioId}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.data.customers.length > 0);
  });

  it('rejects empty customer_data', async () => {
    const { status, data } = await api('POST', '/api/v1/portfolios/ingest', {
      customer_data: [],
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(data.code, 'VALIDATION_ERROR');
  });
});

describe('Conversations', () => {
  it('POST /api/v1/conversations/start creates conversation', async () => {
    const { status, data } = await api('POST', '/api/v1/conversations/start', {
      customer_id: 'cust_t1',
      channel: 'whatsapp',
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.conversation_id.startsWith('conv_'));
    assert.ok(data.initial_message.length > 0);
    assert.ok(data.ai_confidence > 0);
    assert.ok(data.estimated_success_rate > 0);
    assert.strictEqual(data.next_action, 'await_customer_response');
    conversationId = data.conversation_id;
  });

  it('POST /api/v1/conversations/:id/message processes customer message', async () => {
    const { status, data } = await api(
      'POST',
      `/api/v1/conversations/${conversationId}/message`,
      { message: 'Posso pagar, como faço?' }
    );

    assert.strictEqual(status, 200);
    assert.ok(data.ai_response.length > 0);
    assert.ok(data.ai_confidence > 0);
    assert.ok(data.strategy);
    assert.ok(data.personality_cluster);
    assert.ok(Array.isArray(data.payment_options));
  });

  it('detects empathetic intent on fresh conversation', async () => {
    // Start a fresh conversation to avoid history interference
    const conv = await api('POST', '/api/v1/conversations/start', {
      customer_id: 'cust_t2',
      channel: 'sms',
    });
    const { data } = await api(
      'POST',
      `/api/v1/conversations/${conv.data.conversation_id}/message`,
      { message: 'Estou muito apertado, perdi meu emprego' }
    );
    assert.strictEqual(data.strategy, 'empathetic_support');
  });

  it('GET /api/v1/conversations/:id returns conversation history', async () => {
    const { status, data } = await api('GET', `/api/v1/conversations/${conversationId}`);
    assert.strictEqual(status, 200);
    assert.ok(data.data.messages.length >= 3); // initial + 2 customer + 2 ai
  });

  it('returns 404 for unknown customer', async () => {
    const { status } = await api('POST', '/api/v1/conversations/start', {
      customer_id: 'nonexistent',
      channel: 'whatsapp',
    });
    assert.strictEqual(status, 404);
  });
});

describe('Payments', () => {
  it('POST /api/v1/payments/process creates payment', async () => {
    const { status, data } = await api('POST', '/api/v1/payments/process', {
      conversation_id: conversationId,
      payment_proposal: {
        total_amount: 2450.75,
        payment_method: 'pix',
        payment_option: 'full_amount',
      },
      customer_confirmation: {
        method: 'text_confirmation',
        confidence_threshold: 0.85,
      },
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.payment_request_id.startsWith('pay_req_'));
    assert.ok(data.pix_code.length > 0);
    assert.ok(data.qr_code_url.length > 0);
    assert.strictEqual(data.payment_timeout, 3600);
    paymentId = data.payment_request_id;
  });

  it('GET /api/v1/payments lists payments', async () => {
    const { status, data } = await api('GET', '/api/v1/payments');
    assert.strictEqual(status, 200);
    assert.ok(data.total > 0);
  });

  it('returns 404 for unknown conversation', async () => {
    const { status } = await api('POST', '/api/v1/payments/process', {
      conversation_id: 'nonexistent',
      payment_proposal: { total_amount: 100 },
    });
    assert.strictEqual(status, 404);
  });
});

describe('Metrics', () => {
  it('GET /api/v1/metrics/realtime returns dashboard data', async () => {
    const { status, data } = await api('GET', '/api/v1/metrics/realtime?timeframe=1h');
    assert.strictEqual(status, 200);
    assert.ok(data.summary);
    assert.ok(data.summary.total_conversations > 0);
    assert.ok(data.channels);
    assert.ok(data.customer_segments);
    assert.ok(data.channels.whatsapp);
    assert.ok(data.channels.sms !== undefined);
  });

  it('GET /api/v1/metrics/events returns events', async () => {
    const { status, data } = await api('GET', '/api/v1/metrics/events?limit=10');
    assert.strictEqual(status, 200);
    assert.ok(data.total > 0);
  });
});

describe('Error handling', () => {
  it('returns 404 for unknown routes', async () => {
    const { status, data } = await api('GET', '/api/v1/nonexistent');
    assert.strictEqual(status, 404);
    assert.strictEqual(data.code, 'ROUTE_NOT_FOUND');
  });
});
