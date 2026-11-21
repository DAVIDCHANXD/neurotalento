import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../services/api';
import { DEMO_STUDENT, DEMO_CREATOR } from '../data/demo';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('nt-mode') || (import.meta.env.VITE_DEMO_MODE === 'false' ? 'live' : 'demo'));
  const [demoRole, setDemoRole] = useState(() => localStorage.getItem('nt-demo-role') === 'CREATOR' ? 'CREATOR' : 'STUDENT');
  const [demoProfiles, setDemoProfiles] = useState(() => { try { return JSON.parse(localStorage.getItem('nt-demo-profiles')) || {}; } catch { return {}; } });
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(mode === 'live' && !!tokenStore.get());
  useEffect(() => { localStorage.setItem('nt-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('nt-demo-role', demoRole); }, [demoRole]);
  useEffect(() => { localStorage.setItem('nt-demo-profiles', JSON.stringify(demoProfiles)); }, [demoProfiles]);
  useEffect(() => {
    let active = true;
    if (mode !== 'live' || !tokenStore.get()) { setLoading(false); return; }
    setLoading(true);
    api('/auth/me').then(user => active && setAccount(user)).catch(() => active && setAccount(null)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [mode]);
  useEffect(() => {
    const expired = () => setAccount(null);
    window.addEventListener('nt-session-expired', expired);
    return () => window.removeEventListener('nt-session-expired', expired);
  }, []);
  const authenticate = async (endpoint, values) => {
    const result = await api(`/auth/${endpoint}`, { method: 'POST', body: values });
    tokenStore.set(result.token); setAccount(result.user); setMode('live'); return result.user;
  };
  const logout = () => { tokenStore.set(null); setAccount(null); setMode('live'); };
  const demo = role => { setDemoRole(role || 'STUDENT'); setMode('demo'); };
  const user = mode === 'demo' ? { ...(demoRole === 'CREATOR' ? DEMO_CREATOR : DEMO_STUDENT), ...demoProfiles[demoRole] } : account;
  return <AuthContext.Provider value={{ user, mode, loading, login: v => authenticate('login', v), register: v => authenticate('register', v), logout, demo, live: () => setMode('live'), updateDemo: values => setDemoProfiles(s => ({ ...s, [demoRole]: { ...s[demoRole], ...values } })), refreshUser: async () => setAccount(await api('/auth/me')) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
