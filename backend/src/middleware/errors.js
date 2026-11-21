export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const mapped = { P2002: [409, 'Ya existe un registro con esos datos'], P2003: [409, 'La referencia no existe o el recurso tiene dependencias'], P2025: [404, 'Recurso no encontrado'], P2034: [409, 'Conflicto concurrente; vuelve a intentar'] }[error.code];
  const status = mapped?.[0] || error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error('API error:', error.name, error.code || 'INTERNAL');
  res.status(status).json({ success: false, message: mapped?.[1] || (status < 500 ? error.message : 'Error interno del servidor') });
}
