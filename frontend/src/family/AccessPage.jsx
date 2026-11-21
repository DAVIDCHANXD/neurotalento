import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useFamily } from './FamilyContext';
import { ErrorMessage } from './ui';
import GoogleSignIn, { googleEnabled } from './GoogleSignIn';
import { validateGuardian } from './model';

export default function AccessPage() {
  const { enterGoogle, enterPassword, registerPassword, completeGuardian } = useFamily();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(location.pathname === '/registro' ? 'register' : 'login');
  const [role, setRole] = useState(params.get('rol') === 'docente' ? 'TEACHER' : 'TUTOR');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [guardian, setGuardian] = useState({ name: '', age: '', relationship: 'MOTHER', responsible: false });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const change = (key, value) => setValues(v => ({ ...v, [key]: value }));
  function next(accountRole = role) {
    setValues(v => ({ ...v, password: '' }));
    const from = location.state?.from;
    const allowed = accountRole === 'TUTOR' && typeof from === 'string' && /^\/(cursos\/|familia(?:$|\?)|actividad\/)/.test(from);
    navigate(allowed ? from : accountRole === 'TEACHER' ? '/docente' : '/familia');
  }
  function switchMode(value) { setMode(value); setError(''); setPending(null); setValues(v => ({ ...v, password: '' })); }
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setError(''); setBusy(true);
    try {
      if (mode === 'register' && role === 'TUTOR') {
        setGuardian(g => ({ ...g, name: values.name })); setPending({ kind: 'register' }); setStep(1); return;
      }
      const account = mode === 'register' ? await registerPassword({ ...values, role }) : await enterPassword(values.email, values.password);
      if (account.needsGuardian) {
        setRole('TUTOR'); setGuardian(g => ({ ...g, name: account.name })); setPending({ kind: 'existing' }); setStep(1); return;
      }
      next(account.role);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function finishGuardian(event) {
    event.preventDefault(); if (busy) return;
    setError(''); setBusy(true);
    try {
      validateGuardian(guardian);
      if (pending?.kind === 'google') await enterGoogle(pending.credential, pending.challenge, 'TUTOR', guardian);
      else if (pending?.kind === 'register') await registerPassword({ ...values, role: 'TUTOR' }, guardian);
      else if (pending?.kind === 'existing') await completeGuardian(guardian);
      else throw new Error('Vuelve a elegir tu forma de acceso.');
      next('TUTOR');
    } catch (e) {
      setError(e.message);
      if (pending?.kind === 'google' && e.status === 401) { setPending(null); setStep(0); }
      if (pending?.kind === 'register' && e.status === 409) { setPending(null); setStep(0); }
    } finally { setBusy(false); }
  }
  async function google(credential, challenge) {
    setError('');
    if (role === 'TUTOR') { setPending({ kind: 'google', credential, challenge }); setStep(1); return; }
    await enterGoogle(credential, challenge, role, guardian);
    next();
  }
  return <div className="family-login">
    <section><h1>Un espacio para<br /><em>seguir aprendiendo.</em></h1><p>Entra como tutor para acompañar a tu hijo, o como docente para compartir lo que sabes.</p><img className="access-photo" src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&amp;fit=crop&amp;w=900&amp;q=80" alt="Libros, lápices y bloques de letras para aprender" onError={event => { event.currentTarget.hidden = true; }} /></section>
    <section className="family-login-panel">
      {step === 0 ? <>
        <div className="auth-tabs" role="group" aria-label="Tipo de acceso"><button type="button" aria-pressed={mode === 'login'} onClick={() => switchMode('login')}>Iniciar sesión</button><button type="button" aria-pressed={mode === 'register'} onClick={() => switchMode('register')}>Crear cuenta</button></div>
        <form onSubmit={submit} className="password-access">
          <label>Mi espacio<select value={role} onChange={e => { setRole(e.target.value); setError(''); }}><option value="TUTOR">Madre, padre o tutor</option><option value="TEACHER">Docente</option></select></label>
          {mode === 'register' && <label>Nombre<input autoComplete="name" value={values.name} onChange={e => change('name', e.target.value)} required minLength={2} maxLength={100} /></label>}
          <label>Correo electrónico<input type="email" autoComplete="email" value={values.email} onChange={e => change('email', e.target.value)} required maxLength={254} /></label>
          <label>Contraseña{mode === 'register' ? ' · mínimo 10 caracteres' : ''}<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={values.password} onChange={e => change('password', e.target.value)} required minLength={mode === 'register' ? 10 : 1} maxLength={72} /></label>
          <ErrorMessage>{error}</ErrorMessage>
          <button className="family-button" type="submit" disabled={busy}>{busy ? 'Un momento…' : mode === 'register' ? (role === 'TUTOR' ? 'Continuar' : 'Crear mi cuenta') : 'Iniciar sesión'}<ArrowRight size={18} /></button>
        </form>
        {googleEnabled && <><div className="auth-divider"><span>o continúa con</span></div><GoogleSignIn key={role + mode} onCredential={google} onError={setError} /></>}
      </> : <>
        <button type="button" className="family-back" disabled={busy} onClick={() => { setStep(0); setPending(null); setError(''); }}><ArrowLeft size={17} />Volver</button>
        <h2>Datos del tutor</h2><p className="field-note">El registro de los menores lo realiza un adulto responsable.</p>
        <form className="tutor-registration" onSubmit={finishGuardian}>
          <label>Nombre del tutor<input autoComplete="name" value={guardian.name} onChange={e => setGuardian(v => ({ ...v, name: e.target.value }))} minLength={2} maxLength={60} required /></label>
          <div className="family-form-grid"><label>Edad del tutor<input type="number" value={guardian.age} min={18} max={120} step={1} required onChange={e => setGuardian(v => ({ ...v, age: e.target.value }))} /></label><label>Relación con el niño<select value={guardian.relationship} required onChange={e => setGuardian(v => ({ ...v, relationship: e.target.value }))}><option value="MOTHER">Madre</option><option value="FATHER">Padre</option><option value="GUARDIAN">Tutor responsable</option></select></label></div>
          <label className="check-label"><input type="checkbox" checked={guardian.responsible} required onChange={e => setGuardian(v => ({ ...v, responsible: e.target.checked }))} />Tengo 18 años o más y soy el adulto responsable.</label><p className="field-note">La edad es declarada, no una verificación de identidad.</p>
          <ErrorMessage>{error}</ErrorMessage><button className="family-button" type="submit" disabled={busy}>{busy ? 'Un momento…' : 'Guardar y entrar'}<ArrowRight size={18} /></button>
        </form>
      </>}
    </section>
  </div>;
}
