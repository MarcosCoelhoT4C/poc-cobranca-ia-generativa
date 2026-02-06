const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT authentication middleware.
 * For the POC, also accepts the special token "dev-token" for easy testing.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Token de autenticação não fornecido',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  const token = authHeader.slice(7);

  // Dev token for easy POC testing
  if (token === 'dev-token') {
    req.user = {
      sub: 'admin_dev',
      administrator_id: 'admin_12345',
      user_role: 'product_manager',
      scope: [
        'portfolios:read',
        'portfolios:write',
        'conversations:write',
        'analytics:read',
      ],
      permissions: {
        can_create_campaigns: true,
        can_modify_ai_settings: true,
        can_access_financial_data: true,
        can_manage_integrations: true,
      },
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Token inválido ou expirado',
      code: 'AUTH_TOKEN_INVALID',
    });
  }
}

/**
 * Scope-based authorization middleware.
 */
function requireScope(...requiredScopes) {
  return (req, res, next) => {
    const userScopes = req.user?.scope || [];
    const hasScope = requiredScopes.some((s) => userScopes.includes(s));
    if (!hasScope) {
      return res.status(403).json({
        status: 'error',
        message: 'Permissão insuficiente',
        code: 'AUTH_INSUFFICIENT_SCOPE',
        required: requiredScopes,
      });
    }
    next();
  };
}

/**
 * Generate a JWT token (used for the /auth/token endpoint).
 */
function generateToken(payload) {
  return jwt.sign(
    {
      ...payload,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

module.exports = { authenticate, requireScope, generateToken };
