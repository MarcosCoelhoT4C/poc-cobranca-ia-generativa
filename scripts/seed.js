/**
 * Seed script - populates the API with sample data.
 * Usage: node scripts/seed.js [base_url]
 */
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TOKEN = 'dev-token';

async function seed() {
  console.log(`Seeding data to ${BASE_URL}...\n`);

  // 1. Import portfolio
  console.log('1. Importing portfolio...');
  const portfolioRes = await fetch(`${BASE_URL}/api/v1/portfolios/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      administrator_id: 'admin_12345',
      portfolio_type: 'overdue_1_3_months',
      data_source: 'api_sync',
      customer_data: [
        {
          customer_id: 'cust_001',
          document: '12345678901',
          name: 'João Silva Santos',
          phone: '+5511999888777',
          email: 'joao.silva@email.com',
          consortium_id: 'cons_54321',
          overdue_amount: 2450.75,
          overdue_days: 45,
          installments_overdue: 2,
          total_consortium_value: 85000.0,
          last_payment_date: '2024-10-15',
          payment_history_score: 0.75,
          risk_segment: 'medium',
        },
        {
          customer_id: 'cust_002',
          document: '98765432100',
          name: 'Maria Oliveira Costa',
          phone: '+5521988776655',
          email: 'maria.oliveira@email.com',
          consortium_id: 'cons_67890',
          overdue_amount: 5200.0,
          overdue_days: 92,
          installments_overdue: 4,
          total_consortium_value: 120000.0,
          last_payment_date: '2024-08-20',
          payment_history_score: 0.45,
          risk_segment: 'high',
        },
        {
          customer_id: 'cust_003',
          document: '11122233344',
          name: 'Carlos Eduardo Pereira',
          phone: '+5531977665544',
          email: 'carlos.pereira@email.com',
          consortium_id: 'cons_11111',
          overdue_amount: 890.5,
          overdue_days: 15,
          installments_overdue: 1,
          total_consortium_value: 45000.0,
          last_payment_date: '2024-11-01',
          payment_history_score: 0.9,
          risk_segment: 'low',
        },
        {
          customer_id: 'cust_004',
          document: '55566677788',
          name: 'Ana Paula Rodrigues',
          phone: '+5541966554433',
          email: 'ana.rodrigues@email.com',
          consortium_id: 'cons_22222',
          overdue_amount: 3750.0,
          overdue_days: 60,
          installments_overdue: 3,
          total_consortium_value: 200000.0,
          last_payment_date: '2024-09-10',
          payment_history_score: 0.6,
          risk_segment: 'medium',
          age: 28,
        },
        {
          customer_id: 'cust_005',
          document: '99988877766',
          name: 'Roberto Almeida Filho',
          phone: '+5551955443322',
          email: 'roberto.almeida@email.com',
          consortium_id: 'cons_33333',
          overdue_amount: 1200.0,
          overdue_days: 30,
          installments_overdue: 1,
          total_consortium_value: 70000.0,
          last_payment_date: '2024-10-25',
          payment_history_score: 0.82,
          risk_segment: 'low',
          age: 62,
        },
      ],
      business_rules: {
        max_discount_percentage: 15,
        min_installment_value: 100.0,
        preferred_payment_methods: ['pix', 'credit_card'],
        contact_time_window: { start: '09:00', end: '21:00' },
      },
    }),
  });
  const portfolioData = await portfolioRes.json();
  console.log(`   Portfolio: ${portfolioData.portfolio_id} (${portfolioData.customers_imported} customers)\n`);

  // 2. Start conversations
  const customerIds = ['cust_001', 'cust_002', 'cust_003'];
  const channels = ['whatsapp', 'whatsapp', 'sms'];
  const conversationIds = [];

  for (let i = 0; i < customerIds.length; i++) {
    console.log(`2.${i + 1}. Starting conversation for ${customerIds[i]}...`);
    const convRes = await fetch(`${BASE_URL}/api/v1/conversations/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        customer_id: customerIds[i],
        channel: channels[i],
      }),
    });
    const convData = await convRes.json();
    conversationIds.push(convData.conversation_id);
    console.log(`   Conversation: ${convData.conversation_id}`);
    console.log(`   AI Message: "${convData.initial_message.slice(0, 80)}..."`);
    console.log(`   Confidence: ${convData.ai_confidence}\n`);
  }

  // 3. Simulate customer responses
  console.log('3. Simulating customer messages...');
  const messages = [
    { convId: conversationIds[0], msg: 'Posso pagar, como faço?' },
    { convId: conversationIds[1], msg: 'Estou muito apertado, perdi meu emprego recentemente' },
    { convId: conversationIds[2], msg: 'Posso dividir em parcelas?' },
  ];

  for (const { convId, msg } of messages) {
    const msgRes = await fetch(`${BASE_URL}/api/v1/conversations/${convId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ message: msg }),
    });
    const msgData = await msgRes.json();
    console.log(`   Customer: "${msg}"`);
    console.log(`   AI (${msgData.strategy}): "${msgData.ai_response.slice(0, 80)}..."\n`);
  }

  // 4. Process a payment
  console.log('4. Processing payment...');
  const payRes = await fetch(`${BASE_URL}/api/v1/payments/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      conversation_id: conversationIds[0],
      payment_proposal: {
        total_amount: 2450.75,
        payment_method: 'pix',
        payment_option: 'full_amount',
        discount_applied: 0,
        due_date: '2024-11-28',
      },
      customer_confirmation: {
        method: 'text_confirmation',
        confidence_threshold: 0.85,
      },
    }),
  });
  const payData = await payRes.json();
  console.log(`   Payment ID: ${payData.payment_request_id}`);
  console.log(`   PIX Code: ${payData.pix_code?.slice(0, 50)}...`);
  console.log(`   Status: ${payData.status}\n`);

  // 5. Check metrics
  console.log('5. Fetching real-time metrics...');
  const metricsRes = await fetch(`${BASE_URL}/api/v1/metrics/realtime?timeframe=1h`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const metricsData = await metricsRes.json();
  console.log(`   Total Conversations: ${metricsData.summary.total_conversations}`);
  console.log(`   Successful Payments: ${metricsData.summary.successful_payments}`);
  console.log(`   Recovery Amount: R$ ${metricsData.summary.total_recovery_amount}`);
  console.log(`\nSeed completed successfully!`);
}

seed().catch(console.error);
