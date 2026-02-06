const { Router } = require('express');
const { generateToken } = require('../middleware/auth');

const router = Router();

/**
 * POST /api/v1/auth/token
 * Generate a JWT token for API access.
 * In production, this would validate against a user database.
 */
router.post('/token', (req, res) => {
  const { username, password, administrator_id } = req.body;

  // Simple POC authentication
  if (!username || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'username e password são obrigatórios',
      code: 'VALIDATION_ERROR',
    });
  }

  // For the POC, accept any credentials
  const token = generateToken({
    sub: username,
    administrator_id: administrator_id || 'admin_12345',
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
  });

  res.json({
    status: 'success',
    token_type: 'Bearer',
    access_token: token,
    expires_in: 3600,
  });
});

module.exports = router;
