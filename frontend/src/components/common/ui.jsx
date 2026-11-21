import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, Check, Heart, LoaderCircle, Play, Star, X, Code2, Palette, CalendarCheck, Calculator, Languages, Wallet, Globe, PencilLine, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
export const money = (cents, currency = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export const initials = name => (name || 'Neuro Talento').split(' ').slice(0,2).map(v => v[0]).join('').toUpperCase();
export function useResource(loader, dependencies = []) {
  const { mode, user } = useAuth();
  const ref = useRef(loader); ref.current = loader;
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([mode, user?.id, version, ...dependencies]);
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    setState({ key, data: null, loading: true, error: '' });
    Promise.resolve().then(() => ref.current()).then(data => active && setState({ key, data, loading: false, error: '' })).catch(error => active && setState({ key, data: null, loading: false, error: error.message }));
    return () => { active = false; };
  }, [mode, user?.id, version, ...dependencies]);
  return { ...state, ...(state.key !== key ? { loading: true, data: null, error: '' } : {}), reload: () => setVersion(v => v + 1) };
}
export function Loading({ text = 'Preparando tu espacio…' }) { return <div className="loading-state" role="status"><LoaderCircle className="spin" size={26} /><p>{text}</p></div>; }
export function ErrorState({ message, retry }) { return <div className="empty-state error-state" role="alert"><AlertCircle /><h2>No pudimos cargar este espacio</h2><p>{message}</p>{retry && <button className="btn btn-secondary" onClick={retry}>Volver a intentar</button>}</div>; }
export function EmptyState({ title, description, action }) { return <div className="empty-state"><div className="empty-icon"><BookOpen /></div><h2>{title}</h2><p>{description}</p>{action}</div>; }
export function Modal({ title, onClose, children, wide = false }) {
  const dialog = useRef();
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    const cancel = event => { event.preventDefault(); close.current(); };
    el.addEventListener('cancel', cancel);
    const original = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { el.removeEventListener('cancel', cancel); document.body.style.overflow = original; if (el.open) el.close(); };
  }, []);
  return <dialog ref={dialog} className={`modal ${wide ? 'modal-wide' : ''}`} onClick={e => e.target === dialog.current && onClose()} aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
export function Progress({ value, label }) { return <div className="progress-wrap">{label && <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>}<div className="progress-track" role="progressbar" aria-label={label || 'Progreso del curso'} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${value}%` }} /></div></div>; }
const coverThemes = {
  code: { icon: Code2, label: 'Programación', headline: 'De una idea\na tu primer código.', mark: '</>', tone: 'orange' },
  web: { icon: Globe, label: 'Tecnología', headline: 'Tu próxima idea\npuede vivir en la web.', mark: 'www.', tone: 'red' },
  design: { icon: Palette, label: 'Diseño', headline: 'Dale forma\na lo que imaginas.', mark: 'Aa', tone: 'red' },
  draw: { icon: PencilLine, label: 'Dibujo', headline: 'Todo empieza\ncon un trazo.', mark: 'Aa', tone: 'orange' },
  organize: { icon: CalendarCheck, label: 'Organización', headline: 'Haz espacio\npara lo importante.', mark: '01 /', tone: 'yellow' },
  math: { icon: Calculator, label: 'Matemáticas', headline: 'Encuentra la lógica.\nHaz la conexión.', mark: 'x+y', tone: 'orange' },
  language: { icon: Languages, label: 'Idiomas', headline: 'Una conversación.\nNuevas posibilidades.', mark: 'Hola.', tone: 'yellow' },
  finance: { icon: Wallet, label: 'Finanzas', headline: 'Pequeñas decisiones.\nMás claridad.', mark: '+ %', tone: 'red' },
  general: { icon: BookOpen, label: 'Aprendizaje', headline: 'Una nueva habilidad.\nUn paso a la vez.', mark: 'nt.', tone: 'yellow' },
};
const categoryArt = { 'Programación': 'code', 'Diseño': 'design', 'Matemáticas': 'math', 'Idiomas': 'language', 'Educación': 'organize', 'Finanzas': 'finance', 'Tecnología': 'web' };

export function CourseArt({ course, hero = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const type = course?.art || categoryArt[course?.category?.name] || 'general';
  const theme = coverThemes[type] || coverThemes.general;
  const Icon = theme.icon;
  const thumbnail = !hero && course?.thumbnailUrl;
  if (thumbnail && thumbnail !== failedUrl) {
    return <div className="course-art course-photo"><img src={thumbnail} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(thumbnail)} /></div>;
  }
  return <div className={`course-art course-cover cover-${theme.tone} ${hero ? 'hero-art' : ''}`} aria-hidden="true">
    <div className="cover-topline"><span><Icon size={16} strokeWidth={1.5} absoluteStrokeWidth />{theme.label}</span></div>
    <span className="cover-headline">{theme.headline}</span>
    <div className="cover-bottomline"><span>NEUROTALENTO</span><span className="cover-mark">{theme.mark}</span></div>
  </div>;
}

export function HeroArt() {
  return <aside className="journey-art learning-note" aria-label="Una forma de empezar">
    <div className="learning-note-heading"><span className="learning-note-label">A TU MANERA</span><BookOpen size={21} strokeWidth={1.5} absoluteStrokeWidth /></div>
    <p className="learning-note-title">No necesitas hacerlo todo hoy.</p>
    <p className="learning-note-copy">Solo encontrar algo que te dé curiosidad.</p>
    <ol className="learning-note-steps"><li><span>01</span>Elige lo que quieres explorar.</li><li><span>02</span>Empieza con una lección.</li><li><span>03</span>Vuelve cuando quieras.</li></ol>
    <Link className="learning-note-link" to="/catalogo">Encuentra tu primer paso<ArrowUpRight size={17} strokeWidth={2} absoluteStrokeWidth /></Link>
  </aside>;
}
export function CourseCard({ course }) {
  const { isFavorite, toggleFavorite } = usePlatform();
  const favorite = isFavorite(course.id);
  return <article className="course-card"><div className="card-image"><Link to={`/cursos/${course.id}`} aria-label={`Ver ${course.title}`}><CourseArt course={course} /></Link><button className={`favorite-button ${favorite ? 'is-favorite' : ''}`} aria-label={favorite ? `Quitar ${course.title} de favoritos` : `Guardar ${course.title} en favoritos`} aria-pressed={favorite} onClick={() => toggleFavorite(course.id)}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>{course.priceCents === 0 && <span className="free-tag">Gratis para empezar</span>}</div><div className="card-body"><div className="card-category">{course.category?.name || 'Aprendizaje'}<span className="card-level">A tu ritmo</span></div><h3><Link to={`/cursos/${course.id}`}>{course.title}</Link></h3><div className="card-creator"><span className="mini-avatar">{initials(course.creator?.name)}</span><span>{course.creator?.name || 'Creador de NeuroTalento'}</span></div><div className="card-bottom"><span className="card-duration"><BookOpen size={14} />{course.modules ? `${course.modules.flatMap(m => m.lessons).length} lecciones` : 'A tu ritmo'}</span><strong>{course.priceCents === 0 ? 'Gratis' : money(course.priceCents, course.currency)}{course.priceCents > 0 && <small>{course.currency}</small>}</strong></div></div></article>;
}
export function FormError({ message }) { return message ? <p className="form-error" role="alert"><AlertCircle size={17} />{message}</p> : null; }
export function SubmitButton({ busy, children, ...props }) { return <button className="btn btn-primary" disabled={busy} {...props}>{busy ? <LoaderCircle size={17} className="spin" /> : null}{children}</button>; }
