import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { ErrorMessage } from './ui';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const googleEnabled = Boolean(clientId);
let sdk;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!sdk) sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google.accounts.id);
    script.onerror = () => { script.remove(); sdk = null; reject(new Error('No pudimos cargar Google. Comprueba tu conexión.')); };
    document.head.appendChild(script);
  });
  return sdk;
}
export default function GoogleSignIn({ onCredential, onError }) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  const errorCallback = useRef(onError);
  callback.current = onCredential;
  errorCallback.current = onError;
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!clientId) return;
    setError('');
    Promise.all([loadGoogle(), api('/auth/google/challenge', { method: 'POST', body: {} })]).then(([google, challenge]) => {
      if (!active) return;
      google.initialize({ client_id: clientId, nonce: challenge.nonce, auto_select: false, callback: async response => {
        if (!active) return;
        try { await callback.current(response.credential, challenge.challenge); }
        catch (e) { if (active) { errorCallback.current?.(e.message); setAttempt(n => n + 1); } }
      } });
      google.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', locale: 'es', width: Math.min(320, container.current.clientWidth || 280) });
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; container.current?.replaceChildren(); };
  }, [attempt]);
  if (!clientId) return null;
  return <div className="google-sign-in"><div ref={container} /><ErrorMessage>{error}</ErrorMessage>{error && <button type="button" className="family-text-link" onClick={() => setAttempt(n => n + 1)}>Volver a intentar</button>}</div>;
}
