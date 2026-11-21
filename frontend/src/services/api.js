const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const tokenStore = {
  get: () => sessionStorage.getItem('nt-token'),
  set: value => value ? sessionStorage.setItem('nt-token', value) : sessionStorage.removeItem('nt-token'),
};
export async function api(path, { method = 'GET', body, signal } = {}) {
  const token = tokenStore.get();
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { method, headers: { Accept: 'application/json', ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) }, ...(body !== undefined && { body: JSON.stringify(body) }), signal: signal || AbortSignal.timeout(15000) });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No pudimos conectar con la API. Comprueba que el backend esté encendido o explora la demo.');
  }
  const result = await response.json().catch(() => null);
  if (!result) throw new Error('La API no devolvió una respuesta válida. Revisa VITE_API_URL y el servidor.');
  if (!response.ok) {
    if (response.status === 401) { tokenStore.set(null); window.dispatchEvent(new Event('nt-session-expired')); }
    const fields = result.errors?.map(e => `${e.field}: ${e.message}`).join('. ');
    const error = new Error(fields || result.message || 'No se pudo completar la acción.');
    error.status = response.status;
    throw error;
  }
  return result.data ?? result;
}
