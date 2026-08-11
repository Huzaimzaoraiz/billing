const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXP = process.env.JWT_EXP || '1h';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set.');
}

if (JWT_SECRET.includes('replace_')) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be a non-placeholder value in production.');
  }
  console.warn('Using a placeholder JWT_SECRET outside production. Set a strong secret before deployment.');
}

module.exports = { JWT_SECRET, JWT_EXP, AUTH_COOKIE_NAME };
