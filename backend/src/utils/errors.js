export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireValue(value, status = 404, message = 'Recurso no encontrado') {
  if (!value) throw new ApiError(status, message);
  return value;
}
