import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, Focus, GraduationCap, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from './Layout';
import { FormError, SubmitButton } from './ui';

export default function AuthPage({ register = false }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('STUDENT');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (register) values.role = role;

    try {
      const user = await (register ? auth.register(values) : auth.login(values));
      if (!register && user.role !== role) {
        const actual = user.role === 'CREATOR' ? 'docente' : 'estudiante';
        auth.logout();
        setError(`Esta cuenta corresponde a un perfil de ${actual}. Elige “Soy ${actual}” para continuar.`);
        return;
      }
      const from = location.state?.from;
      const safe = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//');
      navigate(safe ? from : user.role === 'CREATOR' ? '/creador' : '/aprendizaje', { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`page auth-page ${register ? 'auth-page-register' : ''} ${focusMode ? 'auth-focus-mode' : ''} ${darkMode ? 'auth-dark-mode' : ''}`}>
      <header className="auth-topbar">
        <Logo />
        <div className="auth-preferences" aria-label="Preferencias de visualización">
          <button type="button" className="auth-preference" role="switch" aria-checked={focusMode} onClick={() => setFocusMode((value) => !value)}>
            <Focus size={17} /><span>Modo Enfoque</span><i aria-hidden="true" />
          </button>
          <button type="button" className="auth-preference" role="switch" aria-checked={darkMode} onClick={() => setDarkMode((value) => !value)}>
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}<span>Modo oscuro</span><i aria-hidden="true" />
          </button>
        </div>
      </header>
      <section className="auth-story" aria-labelledby="auth-story-title">
        <div className="auth-story-copy">
          <span className="eyebrow">APRENDE A TU MANERA</span>
          <h1 id="auth-story-title">Un espacio claro para <span>seguir tu curiosidad.</span></h1>
          <p>Explora cursos, aprende paso a paso o comparte lo que sabes. Tú eliges por dónde empezar.</p>
          <figure className="auth-art">
            <img src="/images/learning-inclusion.png" alt="Infografía sobre TDAH y aprendizaje, con un estudiante en clase e iconos sobre concentración, actividad e instrucciones." />
            <figcaption>Referencia visual: TDAH y aprendizaje</figcaption>
          </figure>
        </div>
        <p className="auth-story-note"><span className="auth-note-dot" />Una interfaz sencilla, con cada paso a la vista.</p>
      </section>

      <section className="auth-panel" aria-labelledby="auth-form-title">
        <div className="auth-form-card">
          <span className="auth-step-label">{register ? 'EMPIEZA POR AQUÍ' : 'QUÉ BUENO TENERTE AQUÍ'}</span>
          <h2 id="auth-form-title">{register ? 'Crea tu cuenta.' : 'Vuelve a tu espacio.'}</h2>
          <p className="auth-intro">{register ? 'Elige cómo quieres participar en NeuroTalento.' : 'Elige tu tipo de cuenta para entrar a tu espacio.'}</p>

          <div className={`role-picker ${register ? '' : 'role-picker-login'}`} role="group" aria-label={register ? 'Tipo de cuenta' : 'Entrar como'}>
            <button type="button" className={role === 'STUDENT' ? 'selected' : ''} aria-pressed={role === 'STUDENT'} onClick={() => setRole('STUDENT')}>
              <BookOpen size={20} /><strong>{register ? 'Estudiante' : 'Soy estudiante'}</strong><span>Explorar y tomar cursos</span>
            </button>
            <button type="button" className={role === 'CREATOR' ? 'selected' : ''} aria-pressed={role === 'CREATOR'} onClick={() => setRole('CREATOR')}>
              <GraduationCap size={21} /><strong>{register ? 'Docente' : 'Soy docente'}</strong><span>Crear y compartir cursos</span>
            </button>
          </div>

          <form onSubmit={submit}>
            {register && <label>¿Cómo te llamas?<input name="name" autoComplete="name" maxLength={100} required placeholder="Tu nombre" /></label>}
            <label>Correo electrónico<input type="email" name="email" autoComplete="email" maxLength={254} required placeholder="tu@correo.com" /></label>
            <label>Contraseña
              <span className="password-input">
                <input type={show ? 'text' : 'password'} name="password" required minLength={register ? 10 : 1} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Al menos 10 caracteres' : 'Tu contraseña'} />
                <button type="button" className="icon-button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show} onClick={() => setShow((value) => !value)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            {register && <p className="field-help">No necesitas indicar un diagnóstico. El tipo de cuenta no se cambia desde el perfil.</p>}
            <FormError message={error} />
            <SubmitButton busy={busy} type="submit">{register ? 'Crear mi cuenta' : 'Entrar a mi espacio'}</SubmitButton>
          </form>

          <p className="auth-switch">{register ? '¿Ya tienes una cuenta?' : '¿Es tu primera vez aquí?'} <Link to={register ? '/login' : '/registro'} state={location.state}>{register ? 'Inicia sesión' : 'Crea tu cuenta'}</Link></p>
          {!register && <div className="auth-demo"><span>¿Quieres conocer el proyecto?</span><button type="button" className="text-link" onClick={() => { auth.demo(); navigate('/'); }}>Explorar la demo sin registrarme</button></div>}
        </div>
        <p className="auth-panel-note">{register ? 'Puedes cambiar de idea y elegir otro camino.' : 'Tus datos se usan para iniciar sesión en tu cuenta.'}</p>
      </section>
    </div>
  );
}
