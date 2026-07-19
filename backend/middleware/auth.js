const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';

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
