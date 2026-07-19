function notFound(req, res) {
  res.status(404).json({ error: 'route not found' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isSequelizeValidation = err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError';
  const isZodError = Array.isArray(err.issues);
  const status = err.status || (isSequelizeValidation || isZodError ? 400 : 500);

  if (status >= 500) console.error(err);

  return res.status(status).json({
    error: status >= 500 ? 'internal server error' : err.message || 'request failed',
    details: isZodError ? err.issues : undefined,
  });
}

module.exports = { notFound, errorHandler };
