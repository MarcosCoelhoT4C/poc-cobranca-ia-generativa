const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'consorciei-dev-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: 'consorciei-auth-service',
    audience: 'consorciei-cobranca-api',
  },
  ai: {
    defaultTemperature: 0.7,
    defaultMaxTokens: 150,
    defaultModel: 'gpt-4-turbo',
  },
  businessRules: {
    maxDiscountPercentage: 15,
    minInstallmentValue: 100.0,
    maxInstallments: 12,
    contactTimeWindow: { start: '09:00', end: '21:00' },
    preferredPaymentMethods: ['pix', 'credit_card'],
  },
  pixKey: process.env.PIX_KEY || 'consorciei@consorciei.com.br',
};

module.exports = config;
