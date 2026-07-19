function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'permission denied' });
    return next();
  };
}

function requireSuperAdmin(req, res, next) {
  return requireRole('SUPER_ADMIN')(req, res, next);
}

module.exports = { requireRole, requireSuperAdmin };
