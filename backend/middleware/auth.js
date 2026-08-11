const jwt = require('jsonwebtoken');
const { AUTH_COOKIE_NAME, JWT_SECRET } = require('../config');

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || (req.headers.authorization || '').replace(/^Bearer\s+/, '') || null;
    if (!token) return res.status(401).json({ error: 'missing auth token' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

module.exports = { authMiddleware };
