import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, tokenStore } from '../services/api';
import { courseVideo } from './media';
import { DEMO_KEY, initialState, transition, teacherId, tutorId, validateGuardian, upgradeState, invitationCode, importInvitation, restoreTeacherInvitations, carryInvitationCourses } from './model';
const FamilyContext = createContext(null);
const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
function readDemo() {
  try { return upgradeState(JSON.parse(sessionStorage.getItem(DEMO_KEY))); } catch { /* A damaged demo starts with fictional fixtures. */ }
  return initialState();
}
export function FamilyProvider({ children }) {
  const [state, setState] = useState(readDemo);
  const stateRef = useRef(state);
  const storageKey = useRef(DEMO_KEY);
  const [session, setSession] = useState(() => { try { if (googleConfigured) return null; const role = sessionStorage.getItem(`${DEMO_KEY}-role`); return ['TUTOR', 'TEACHER'].includes(role) ? { role, id: role === 'TUTOR' ? tutorId : teacherId } : null; } catch { return null; } });
  const [notice, setNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(Boolean(tokenStore.get()));
  const [invitationsSyncing, setInvitationsSyncing] = useState(false);
  function useAccount(user, provider = 'ACCOUNT') {
    const role = user.role === 'CREATOR' ? 'TEACHER' : 'TUTOR';
    storageKey.current = `${DEMO_KEY}-google-${user.id}`;
    let next, stored;
    try { stored = sessionStorage.getItem(storageKey.current); next = upgradeState(JSON.parse(stored)); } catch { next = initialState(); }
    if (!stored) next = { ...next, children: [], guardians: [] };
    next = carryInvitationCourses(next, stateRef.current);
    const adult = user.studentProfile?.preferences?.guardian;
    if (role === 'TUTOR' && adult) {
      try { next = { ...next, guardians: [validateGuardian({ ...adult, name: user.name })] }; } catch { /* Legacy accounts complete the guardian step. */ }
    }
    // Course activities remain local until the family API is implemented.
    if (role === 'TEACHER') {
      next = { ...next, teacher: { ...next.teacher, name: user.name, ...(!stored && { training: '', experience: '', biography: '', review: 'PENDING', subscription: false }) } };
    }
    stateRef.current = next; setState(next);
    setSession({ role, id: role === 'TUTOR' ? tutorId : teacherId, accountId: user.id, name: user.name, provider });
    return next;
  }
  useEffect(() => {
    let active = true;
    const restoredToken = tokenStore.get();
    if (restoredToken) api('/auth/me').then(user => { if (active && tokenStore.get() === restoredToken) useAccount(user); }).catch(e => { if (active && tokenStore.get() === restoredToken) { tokenStore.set(null); setNotice(e.message); } }).finally(() => { if (active) setAuthLoading(false); });
    const expired = () => { setSession(null); tokenStore.set(null); };
    window.addEventListener('nt-session-expired', expired);
    return () => { active = false; window.removeEventListener('nt-session-expired', expired); };
  }, []);
  useEffect(() => {
    if (session?.role !== 'TEACHER' || !session.accountId) { setInvitationsSyncing(false); return; }
    const key = storageKey.current;
    const oldInvitations = stateRef.current.invitations.filter(i => i.active && !i.persisted && stateRef.current.courses.some(c => c.id === i.courseId && c.creatorId === session.id && c.status === 'PUBLISHED'));
    let active = true;
    setInvitationsSyncing(true);
    (async () => {
      for (const invitation of oldInvitations) {
        if (!active || storageKey.current !== key) return;
        const course = stateRef.current.courses.find(c => c.id === invitation.courseId);
        const result = await api('/family/invitations', { method: 'POST', body: { migrate: true, code: invitation.code, course: { ...course, videoUrl: courseVideo(course) }, subject: stateRef.current.subjects.find(s => s.id === course.subjectId), teacher: stateRef.current.teacher } });
        if (!active || storageKey.current !== key) return;
        const next = { ...stateRef.current, invitations: stateRef.current.invitations.map(i => i.code === invitation.code ? { ...i, active: result.active, persisted: true } : i) };
        stateRef.current = next; setState(next);
        sessionStorage.setItem(key, JSON.stringify(next));
      }
      const saved = await api('/family/invitations/mine');
      if (!active || storageKey.current !== key) return;
      const next = restoreTeacherInvitations(stateRef.current, saved, session.id);
      stateRef.current = next; setState(next);
      sessionStorage.setItem(key, JSON.stringify(next));
    })().catch(e => { if (active) setNotice(`No se pudo guardar una invitación: ${e.message}`); }).finally(() => { if (active) setInvitationsSyncing(false); });
    return () => { active = false; };
  }, [session?.accountId, session?.role]);
  function acceptAccount(result, provider) {
    setAuthLoading(false);
    tokenStore.set(result.token);
    const next = useAccount(result.user, provider);
    try { sessionStorage.setItem(storageKey.current, JSON.stringify(next)); } catch { setNotice('No se pudo guardar el perfil en este navegador.'); }
    return { role: result.user.role === 'CREATOR' ? 'TEACHER' : 'TUTOR', needsGuardian: result.user.role === 'STUDENT' && !next.guardians.length, name: result.user.name };
  }
  async function enterPassword(email, password) {
    return acceptAccount(await api('/auth/login', { method: 'POST', body: { email, password } }), 'PASSWORD');
  }
  async function registerPassword(values, guardianValues) {
    const guardian = values.role === 'TUTOR' ? validateGuardian(guardianValues) : undefined;
    return acceptAccount(await api('/auth/register', { method: 'POST', body: { name: values.name, email: values.email, password: values.password, role: values.role === 'TEACHER' ? 'CREATOR' : 'STUDENT', ...(guardian && { guardian: { age: guardian.age, relationship: guardian.relationship, responsible: guardian.responsible } }) } }), 'PASSWORD');
  }
  async function completeGuardian(values) {
    const guardian = validateGuardian(values);
    const user = await api('/auth/guardian', { method: 'PUT', body: { age: guardian.age, relationship: guardian.relationship, responsible: guardian.responsible } });
    const next = useAccount(user, 'PASSWORD');
    try { sessionStorage.setItem(storageKey.current, JSON.stringify(next)); } catch { setNotice('No se pudo guardar el perfil en este navegador.'); }
  }
  async function enterGoogle(credential, challenge, role, guardianValues) {
    const guardian = role === 'TUTOR' ? validateGuardian(guardianValues) : undefined;
    const result = await api('/auth/google', { method: 'POST', body: { credential, challenge, role, ...(guardian && { guardian: { age: guardian.age, relationship: guardian.relationship, responsible: guardian.responsible } }) } });
    tokenStore.set(result.token);
    setAuthLoading(false);
    const next = useAccount(result.user);
    if (guardian) {
      next.guardians = [guardian];
      stateRef.current = next; setState({ ...next });
    }
    try { sessionStorage.setItem(storageKey.current, JSON.stringify(next)); } catch { setNotice('No se pudo guardar el perfil en este navegador.'); }
  }
  function enterDemo(role, guardianValues) {
    if (googleConfigured) throw new Error('Continúa con tu cuenta de Google.');
    if (!['TUTOR', 'TEACHER'].includes(role)) return;
    if (role === 'TUTOR') {
      const guardian = validateGuardian(guardianValues);
      const next = { ...stateRef.current, guardians: [guardian] };
      stateRef.current = next; setState(next);
      try { sessionStorage.setItem(DEMO_KEY, JSON.stringify(next)); } catch { setNotice('El registro de muestra se conservará solo mientras esta página esté abierta.'); }
    }
    setSession({ role, id: role === 'TUTOR' ? tutorId : teacherId });
    try { sessionStorage.setItem(`${DEMO_KEY}-role`, role); } catch { setNotice('El navegador no permite guardar la sesión. Puedes continuar mientras esta página esté abierta.'); }
  }
  function leave() { setSession(null); tokenStore.set(null); storageKey.current = DEMO_KEY; const next = carryInvitationCourses(readDemo(), stateRef.current); stateRef.current = next; setState(next); window.google?.accounts?.id?.disableAutoSelect(); try { sessionStorage.removeItem(`${DEMO_KEY}-role`); } catch { /* In-memory sign-out still applies. */ } }
  function act(action) {
    const expectedKey = session?.accountId ? `${DEMO_KEY}-google-${session.accountId}` : DEMO_KEY;
    if (storageKey.current !== expectedKey) throw new Error('La cuenta cambió. Vuelve a abrir tu espacio para continuar.');
    const output = transition(stateRef.current, session, action, { allowUnpaidTeaching: import.meta.env.DEV, allowUnreviewedTeaching: import.meta.env.DEV });
    const commit = () => {
    if (storageKey.current !== expectedKey) throw new Error('La cuenta cambió antes de completar la acción.');
    stateRef.current = output.state;
    setState(output.state);
    try { sessionStorage.setItem(storageKey.current, JSON.stringify(output.state)); } catch { setNotice('No se pudo guardar el avance en este navegador. Mantén la página abierta para continuar.'); }
    return output.result;
    };
    if (session?.accountId && ['INVITE', 'REVOKE', 'SAVE_COURSE'].includes(action.type)) {
      if (action.type === 'INVITE') {
        const course = output.state.courses.find(c => c.id === action.courseId);
        return api('/family/invitations', { method: 'POST', body: { code: output.result.code, course: { ...course, videoUrl: courseVideo(course) }, subject: output.state.subjects.find(s => s.id === course.subjectId), teacher: output.state.teacher } }).then(() => {
          output.state.invitations = output.state.invitations.map(i => i.code === output.result.code ? { ...i, persisted: true } : i);
          return commit();
        });
      }
      const courseId = action.type === 'SAVE_COURSE' ? action.id : action.courseId;
      if (courseId) return api(`/family/invitations/course/${encodeURIComponent(courseId)}`, { method: 'DELETE' }).then(commit);
    }
    return commit();
  }
  async function resolveInvitation(value) {
    const code = invitationCode(value);
    if (!code) throw new Error('Pega una clave NT-XXXXXXXX o el enlace completo de la invitación.');
    const bundle = await api(`/family/invitations/${encodeURIComponent(code)}`);
    const next = importInvitation(stateRef.current, bundle);
    stateRef.current = next; setState(next);
    try { sessionStorage.setItem(storageKey.current, JSON.stringify(next)); } catch { setNotice('No se pudo guardar el curso en este navegador.'); }
    return bundle.course;
  }
  return <FamilyContext.Provider value={{ state, session, enterDemo, enterGoogle, enterPassword, registerPassword, completeGuardian, resolveInvitation, authLoading, invitationsSyncing, leave, act, notice, dismissNotice: () => setNotice('') }}>{children}</FamilyContext.Provider>;
}
export const useFamily = () => useContext(FamilyContext);
