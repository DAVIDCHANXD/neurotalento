import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Search } from 'lucide-react';
import { useFamily } from './FamilyContext';
import { findInvitation, invitationCode, LEVELS, money } from './model';
import { CourseArtwork, CourseTile, ErrorMessage, PageHeading } from './ui';
import CourseVideo from './CourseVideo';
import { courseVideo } from './media';

export function Welcome() {
  const { state } = useFamily();
  const [subject, setSubject] = useState('');
  const published = state.courses.filter(c => c.status === 'PUBLISHED');
  const featured = subject ? published.filter(c => c.subjectId === subject).slice(0, 3) : published.filter((c, i, all) => all.findIndex(v => v.subjectId === c.subjectId) === i).slice(0, 3);
  return <>
    <section className="family-hero"><div className="family-hero-copy"><span className="hero-audience">Preescolar y primaria</span><h1>Aprender jugando.<br /><em>A su ritmo.</em></h1><p>Distintas materias. Actividades cortas. Un espacio para descubrir, intentar y avanzar con acompañamiento.</p><div className="family-actions"><Link className="family-button" to="/catalogo">Explorar cursos<ArrowRight size={18} /></Link><Link className="family-text-link" to="/login?rol=docente">Quiero enseñar<ArrowRight size={17} /></Link></div></div><div className="hero-photo"><CourseArtwork course={state.courses.find(c => c.subjectId === 'art') || state.courses[0]} /><Link to="/cursos/contamos-1-5" className="hero-video-link"><span aria-hidden="true">▶</span><span><strong>Mira, descubre y practica</strong><small>Empieza con los números del 1 al 5</small></span><ArrowRight size={20} /></Link></div></section>
    <section className="family-section"><div className="section-title"><h2>¿Qué vamos a descubrir?</h2><Link className="family-text-link" to="/catalogo">Ver todos<ArrowRight size={17} /></Link></div><div className="subject-tabs" role="group" aria-label="Materias destacadas"><button className={!subject ? 'selected' : ''} aria-pressed={!subject} onClick={() => setSubject('')}>Para explorar</button>{state.subjects.filter(s => published.some(c => c.subjectId === s.id)).map(s => <button key={s.id} className={subject === s.id ? 'selected' : ''} aria-pressed={subject === s.id} onClick={() => setSubject(s.id)}>{s.name}</button>)}</div><div className="family-course-grid">{featured.map(c => <CourseTile key={c.id} course={c} />)}</div></section>
  </>;
}
export { default as FamilyLogin } from './AccessPage';

export function FamilyCatalog() {
  const { state, session, authLoading, resolveInvitation } = useFamily();
  const [params, setParams] = useSearchParams();
  const [level, setLevel] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [code, setCode] = useState(params.get('clave') || '');
  const [error, setError] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const inviteCode = params.get('clave');
  const invited = inviteCode && !error ? findInvitation(state, inviteCode) : null;
  useEffect(() => {
    let active = true;
    if (!inviteCode) { setLooking(false); return; }
    if (authLoading) { setLooking(true); return; }
    setLooking(true); setError('');
    resolveInvitation(inviteCode).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLooking(false); });
    return () => { active = false; };
  }, [inviteCode, lookupAttempt, session?.accountId, authLoading]);
  const courses = state.courses.filter(c => c.status === 'PUBLISHED' && (inviteCode || !level || c.level === level) && (inviteCode || !subjectId || c.subjectId === subjectId) && (inviteCode || !search || `${c.title} ${c.area} ${c.objective}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))) && (!inviteCode || invited?.id === c.id));
  const pages = Math.max(1, Math.ceil(courses.length / 3));
  const currentPage = Math.min(page, pages);
  const visibleCourses = courses.slice((currentPage - 1) * 3, currentPage * 3);
  function find(event) {
    event.preventDefault(); setError('');
    const normalized = invitationCode(code);
    if (!normalized) { setError('Pega una clave NT-XXXXXXXX o el enlace completo de la invitación.'); return; }
    setLevel(''); setSubjectId(''); setSearch(''); setPage(1); setCode(normalized);
    setParams({ clave: normalized }); setLookupAttempt(n => n + 1);
  }
  return <><PageHeading title="Encuentra su próxima aventura" description="Elige una materia y empieza con un pequeño paso." />
    <div className="catalog-toolbar"><label className="catalog-search"><Search size={19} /><input aria-label="Buscar cursos" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar un curso…" maxLength={100} /></label><label className="catalog-level">Nivel<select aria-label="Nivel educativo" value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(LEVELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><details className="course-code"><summary>Tengo una clave</summary><form onSubmit={find}><label>Clave o enlace del curso<input aria-label="Clave del curso" value={code} onChange={e => setCode(e.target.value)} maxLength={2048} required placeholder="NT-XXXXXXXX o enlace de invitación" /></label><button type="submit" className="family-button compact" disabled={looking}>{looking ? 'Buscando…' : 'Encontrar curso'}</button><ErrorMessage>{error}</ErrorMessage></form></details></div>
    <div className="subject-tabs" role="group" aria-label="Filtrar por materia"><button className={!subjectId ? 'selected' : ''} aria-pressed={!subjectId} onClick={() => { setSubjectId(''); setPage(1); }}>Todas</button>{state.subjects.map(s => <button key={s.id} aria-pressed={subjectId === s.id} className={subjectId === s.id ? 'selected' : ''} onClick={() => { setSubjectId(s.id); setPage(1); }}>{s.name}</button>)}</div>
    {inviteCode && <div className="invitation-result"><p>{looking ? 'Buscando el curso…' : invited ? 'Curso encontrado.' : error || 'Esta invitación no está disponible.'}</p><button className="family-text-link" onClick={() => { setParams({}); setCode(''); }}>Quitar invitación</button></div>}
    <div className="catalog-count" role="status">{courses.length} {courses.length === 1 ? 'curso' : 'cursos'}</div><div className="family-course-grid">{visibleCourses.map(c => <CourseTile key={c.id} course={c} />)}</div>{pages > 1 && <nav className="catalog-pagination" aria-label="Páginas del catálogo"><button className="family-button secondary compact" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>{currentPage} / {pages}</span><button className="family-button secondary compact" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav>}{!courses.length && !looking && <div className="family-empty"><h2>No encontramos cursos con estos filtros.</h2><button className="family-button secondary" onClick={() => { setSearch(''); setLevel(''); setSubjectId(''); setParams({}); }}>Ver todos los cursos</button></div>}
  </>;
}

export function FamilyCourse() {
  const { id } = useParams();
  const { state, session, act } = useFamily();
  const location = useLocation();
  const course = state.courses.find(c => c.id === id && c.status === 'PUBLISHED');
  const teacher = course?.teacher || state.teacher;
  const children = state.children.filter(c => c.tutorId === session?.id && c.level === course?.level);
  const [childId, setChildId] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const selected = children.find(c => c.id === childId) || children[0];
  const existing = state.enrollments.find(e => e.childId === selected?.id && e.courseId === id && e.tutorId === session?.id);
  if (!course) return <div className="family-empty"><h1>Este curso no está disponible.</h1><Link className="family-button" to="/catalogo">Volver a los cursos</Link></div>;
  function enroll() {
    setError('');
    try { if (!consent) throw new Error('Confirma la inscripción.'); act({ type: 'ENROLL', courseId: id, childId: selected?.id }); } catch (e) { setError(e.message); }
  }
  return <><PageHeading title={course.title} description={course.description === course.objective ? undefined : course.description} back="/catalogo" /><div className="course-detail-grid"><div><CourseArtwork course={course} /><CourseVideo url={courseVideo(course)} title={course.title} /><section className="course-description"><h2>Lo que va a aprender</h2><p>{course.objective}</p><div className="course-facts"><span>{LEVELS[course.level]}</span><span>{course.area}</span><span>{course.activity.questions.length} {course.activity.questions.length === 1 ? 'ejercicio' : 'ejercicios'}</span></div></section><details className="teacher-details"><summary>Conoce a {teacher.name}</summary><p>{teacher.training}</p><p>{teacher.experience}</p><p>{teacher.biography}</p></details></div><aside className="enrollment-panel"><h2>Empezar este curso</h2><p className="course-detail-price">{money(course.priceCents)} <small>MXN</small></p><span className="trial-label">Inscripción · Sin cobro</span>
    {!session ? <Link className="family-button" to="/login" state={{ from: location.pathname }}>Entrar como tutor</Link> : session.role !== 'TUTOR' ? <Link className="family-button secondary" to="/login" state={{ from: location.pathname }}>Entrar como tutor</Link> : children.length === 0 ? <><p>Añade un perfil de {LEVELS[course.level].toLowerCase()} para continuar.</p><Link className="family-button" to={`/familia?nivel=${course.level}`}>Registrar a mi hijo</Link></> : <><label>¿Quién va a aprender?<select value={selected?.id || ''} onChange={e => { setChildId(e.target.value); setError(''); }}>{children.map(c => <option key={c.id} value={c.id}>{c.nickname}</option>)}</select></label>{existing ? <><p className="family-success"><Check size={18} />Inscripción confirmada.</p><Link className="family-button" to={`/actividad/${existing.id}`}>Abrir actividad de {selected.nickname}<ArrowRight size={18} /></Link><Link className="family-text-link" to="/familia">Ver su avance</Link></> : <><label className="check-label"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Confirmo la inscripción, sin cobro.</label><ErrorMessage>{error}</ErrorMessage><button className="family-button" onClick={enroll} disabled={!consent}>Inscribir a {selected?.nickname}</button></>}</>}
    </aside></div></>;
}
