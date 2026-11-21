import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, GraduationCap, LogOut, ShieldCheck, X } from 'lucide-react';
import { useFamily } from './FamilyContext';
import { LEVELS, money, SUPPORTS } from './model';
import { useState } from 'react';
import { subjectPhotos } from './media';

export function Brand() {
  return <Link to="/" className="nt-brand" aria-label="NeuroTalento inicio"><span className="nt-brand-mark"><BookOpen size={23} strokeWidth={1.8} /></span><span>neuro<strong>talento</strong><small>UN PASO A LA VEZ</small></span></Link>;
}
export function FamilyShell({ children }) {
  const { session, leave, notice, dismissNotice } = useFamily();
  const { pathname } = useLocation();
  if (pathname.startsWith('/actividad/')) return <div className="family-app child-shell">{children}</div>;
  return <div className={`family-app${['/login', '/registro'].includes(pathname) ? ' access-shell' : ''}`}>
    <header className="family-header"><Brand />
      <nav aria-label="Navegación principal"><NavLink to="/" end>Inicio</NavLink><NavLink to="/catalogo">Cursos</NavLink>{session?.role === 'TUTOR' && <NavLink to="/familia">Mi familia</NavLink>}{session?.role === 'TEACHER' && <NavLink to="/docente">Espacio docente</NavLink>}</nav>
      <div className="family-account">{session ? <><Link to="/login" className="account-switch">{session.role === 'TUTOR' ? 'Tutor' : 'Docente'}</Link><button className="family-icon-button" aria-label="Cerrar sesión" onClick={leave}><LogOut size={18} /></button></> : <Link className="family-button compact" to="/login">Entrar</Link>}</div>
    </header>
    {notice && <div className="family-notice" role="alert">{notice}<button aria-label="Cerrar aviso" onClick={dismissNotice}><X size={18} /></button></div>}
    <main className="family-main" id="family-content">{children}</main>
    <footer className="family-footer"><Brand /><span>Aprender, a su manera.</span><details className="platform-info"><summary>Información de la plataforma</summary><p>Apoyo educativo para preescolar y primaria. No ofrece diagnósticos ni tratamientos. Las actividades y los avances se guardan en esta pestaña. Los cobros todavía no están conectados.</p></details></footer>
  </div>;
}
export function RequireAdult({ role, children }) {
  const { session, state, authLoading } = useFamily();
  const location = useLocation();
  if (authLoading) return <p role="status">Comprobando tu sesión…</p>;
  if (!session || (session.role === 'TUTOR' && !state.guardians?.some(g => g.tutorId === session.id && g.responsible && g.age >= 18))) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (role && session.role !== role) return <section className="family-empty"><ShieldCheck size={34} /><h1>Este espacio corresponde a otra cuenta.</h1><Link className="family-button" to={session.role === 'TEACHER' ? '/docente' : '/familia'}>Volver a mi espacio</Link></section>;
  return children;
}
export function PageHeading({ title, description, action, back }) {
  return <div className="family-heading">{back && <Link className="family-back" to={back}><ArrowLeft size={17} />Volver</Link>}<div><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div></div>;
}
export function ErrorMessage({ children }) { return children ? <p className="family-error" role="alert">{children}</p> : null; }
export function StatusMessage({ children }) { return children ? <p className="family-success" role="status"><Check size={18} />{children}</p> : null; }
export function Empty({ title, children, action }) { return <div className="family-empty"><BookOpen size={30} /><h2>{title}</h2>{children && <p>{children}</p>}{action}</div>; }
export function SupportChecks({ value, onChange, options = SUPPORTS }) {
  return <div className="support-checks">{Object.entries(options).map(([key, label]) => <label key={key}><input type="checkbox" checked={value.includes(key)} onChange={e => onChange(e.target.checked ? [...value, key] : value.filter(v => v !== key))} />{label}</label>)}</div>;
}
export function LevelBadge({ level }) { return <span className={`level-badge ${level === 'PRIMARY' ? 'primary-level' : ''}`}>{LEVELS[level]}</span>; }
export function CourseArtwork({ course }) {
  const [failed, setFailed] = useState(false);
  const picture = subjectPhotos[course.subjectId] || subjectPhotos.spanish;
  const src = course.imageUrl || picture.src;
  return <div className="course-artwork photo-cover">{!failed ? <img key={src} src={src} alt={course.imageUrl ? course.title : picture.alt} loading="lazy" onError={() => setFailed(true)} /> : <span className="photo-fallback">{course.area}</span>}</div>;
}
export function CourseTile({ course }) {
  const { state } = useFamily();
  return <article className="family-course"><Link to={`/cursos/${course.id}`} className="family-course-cover" aria-label={`Ver ${course.title}`}><CourseArtwork course={course} /></Link><div className="family-course-body"><LevelBadge level={course.level} /><h2><Link to={`/cursos/${course.id}`}>{course.title}</Link></h2><p>{course.objective}</p><div className="course-teacher"><GraduationCap size={16} />{course.teacher?.name || state.teacher.name}</div><div className="family-course-bottom"><span>{money(course.priceCents)} <small>MXN</small></span><Link to={`/cursos/${course.id}`} className="family-text-link">Ver curso<ArrowUpRight size={17} /></Link></div></div></article>;
}
