import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, PencilLine, Plus } from 'lucide-react';
import { useFamily } from './FamilyContext';
import { LEVELS, money, progressOf } from './model';
import { Empty, ErrorMessage, LevelBadge, PageHeading, StatusMessage, SupportChecks } from './ui';

export default function TutorPage() {
  const { state, session, act, resolveInvitation } = useFamily(); const [params] = useSearchParams();
  const children = state.children.filter(c => c.tutorId === session.id);
  const [editing, setEditing] = useState(params.has('nivel') ? 'new' : null);
  const [values, setValues] = useState({ nickname: '', age: '', level: params.get('nivel') === 'PRIMARY' ? 'PRIMARY' : 'PRESCHOOL', supports: ['visuals', 'repeat', 'breaks'], note: '' });
  const [selectedChild, setSelectedChild] = useState('');
  const [profileStep, setProfileStep] = useState(0);
  const [invitation, setInvitation] = useState('');
  const [course, setCourse] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const enrollments = state.enrollments.filter(e => e.tutorId === session.id);
  function open(child) { setInvitation(''); setCourse(null); setProfileStep(0); setValues(child ? { ...child } : { nickname: '', age: '', level: 'PRESCHOOL', supports: ['visuals', 'repeat', 'breaks'], note: '' }); setEditing(child?.id || 'new'); setError(''); setMessage(''); }
  async function validateCode() {
    const resolved = await resolveInvitation(invitation);
    setCourse(resolved);
    if (resolved.level !== values.level) throw new Error(`El curso es de ${LEVELS[resolved.level]}. Elige un curso del nivel del alumno.`);
    return resolved;
  }
  async function checkCode() {
    if (busy) return; setBusy(true); setError('');
    try { await validateCode(); } catch (e) { setError(e.message); setCourse(null); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); if (busy) return; setError(''); setBusy(true);
    try {
      const resolved = invitation.trim() ? await validateCode() : null;
      if (profileStep === 0) { setProfileStep(1); return; }
      const action = { type: resolved ? 'REGISTER_CHILD_WITH_INVITATION' : 'SAVE_CHILD', id: editing === 'new' ? undefined : editing, values, ...(resolved && { courseId: resolved.id }) };
      const result = act(action);
      setSelectedChild(resolved ? result.child.id : result.id); setEditing(null);
      setMessage(resolved ? `Perfil guardado e inscrito en ${resolved.title}.` : 'Perfil guardado.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const change = (name, value) => setValues(v => ({ ...v, [name]: value }));
  return <><PageHeading title="Mi familia" description="Su siguiente actividad, a un toque." action={<button className="family-button" onClick={() => open()}><Plus size={18} />Registrar a mi hijo</button>} /><StatusMessage>{message}</StatusMessage>
    {editing && <section className="family-form-section"><h2>{editing === 'new' ? 'Un nuevo perfil infantil' : 'Preferencias de aprendizaje'}</h2><form onSubmit={save}>{profileStep === 0 && <><p className="field-note">Paso 1 de 2 · Perfil básico</p><div className="family-form-grid"><label>Nombre del niño<input value={values.nickname} onChange={e => change('nickname', e.target.value)} required maxLength={40} placeholder="Por ejemplo: Leo" autoComplete="off" /></label><label>Edad del niño<input type="number" min={3} max={12} step={1} required value={values.age} onChange={e => change('age', e.target.value)} /></label><label>Nivel educativo<select value={values.level} onChange={e => change('level', e.target.value)}>{Object.entries(LEVELS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div><div className="child-invitation"><label>Clave del docente <span className="optional">(opcional)</span><input value={invitation} onChange={e => { setInvitation(e.target.value); setCourse(null); setError(''); }} maxLength={2048} placeholder="NT-XXXXXXXX o enlace de invitación" /></label><button type="button" className="family-button secondary compact" disabled={busy || !invitation.trim()} onClick={checkCode}>{busy ? 'Validando…' : 'Validar clave'}</button></div>{course && <StatusMessage>Curso: {course.title} · {LEVELS[course.level]}</StatusMessage>}</>}{profileStep === 1 && <><p className="field-note">Paso 2 de 2 · Apoyos</p><fieldset><legend>¿Qué apoyos le resultan útiles?</legend><SupportChecks value={values.supports} onChange={value => change('supports', value)} /></fieldset><label>Una preferencia para su docente <span className="optional">(opcional)</span><textarea value={values.note} onChange={e => change('note', e.target.value)} maxLength={250} rows={2} placeholder="Por ejemplo: le ayuda ver un ejemplo antes de empezar." /></label><p className="field-note">Puedes ajustar sus preferencias después.</p></>}<ErrorMessage>{error}</ErrorMessage><div className="family-actions"><button className="family-button" type="submit" disabled={busy}>{busy ? 'Un momento…' : profileStep === 0 ? 'Continuar' : (invitation.trim() ? 'Guardar e inscribir' : 'Guardar perfil')}</button>{profileStep === 1 && <button type="button" className="family-button secondary" onClick={() => setProfileStep(0)}>Atrás</button>}<button className="family-button secondary" type="button" onClick={() => setEditing(null)}>Cancelar</button></div></form></section>}
    {!editing && <><section className="family-section"><div className="section-title"><div><h2>Sus perfiles</h2><p>Elige un perfil para continuar.</p></div></div>{children.length > 1 && <label className="profile-selector">Elige un perfil<select value={children.some(c => c.id === selectedChild) ? selectedChild : children[0]?.id || ''} onChange={e => setSelectedChild(e.target.value)}>{children.map(c => <option key={c.id} value={c.id}>{c.nickname} · {LEVELS[c.level]}</option>)}</select></label>}{children.length ? <div className="child-profiles">{children.filter(c => c.id === (children.some(v => v.id === selectedChild) ? selectedChild : children[0]?.id)).map(child => { const rows = enrollments.filter(e => e.childId === child.id); return <article className="child-profile" key={child.id}><div className="child-profile-head"><div className="child-avatar" aria-hidden="true">{child.nickname.slice(0, 1)}</div><div><h3>{child.nickname}</h3><LevelBadge level={child.level} /></div><button className="family-icon-button" aria-label={`Editar perfil de ${child.nickname}`} onClick={() => open(child)}><PencilLine size={19} /></button></div>{rows.length ? rows.map(e => <div className="child-course-row" key={e.id}><div><h4>{e.courseTitle}</h4><p>{e.completed.length} de {e.activity.questions.length} pasos resueltos</p><progress value={e.completed.length} max={e.activity.questions.length} aria-label={`Avance de ${child.nickname} en ${e.courseTitle}`} /><span className="progress-summary">{progressOf(e)}% del recorrido</span>{e.teacherNote && <p className="tutor-preference"><strong>Tu docente sugiere:</strong> {e.teacherNote}</p>}</div><Link className="family-button" to={`/actividad/${e.id}`}>{progressOf(e) === 100 ? 'Volver a practicar' : 'Abrir actividad'}<ArrowRight size={18} /></Link></div>) : <div className="child-course-row"><p>Elige su primer curso.</p><Link className="family-text-link" to="/catalogo">Explorar cursos<ArrowRight size={17} /></Link></div>}</article>; })}</div> : <Empty title="El primer paso es crear su perfil" action={<button className="family-button" onClick={() => open()}>Registrar a mi hijo</button>}>Elige su nivel y los apoyos que le ayudan.</Empty>}</section>
    <details className="family-section receipt-details"><summary>Ver inscripciones</summary><p className="field-note">Estos registros no representan cobros ni transferencias.</p>{state.receipts.filter(r => r.ownerId === session.id && r.kind === 'ENROLLMENT').length ? <div className="family-table-wrap"><table className="family-table"><caption className="sr-only">Inscripciones de la familia</caption><thead><tr><th>Curso</th><th>Destinatario</th><th>Importe</th><th>Estado</th></tr></thead><tbody>{state.receipts.filter(r => r.ownerId === session.id && r.kind === 'ENROLLMENT').map(r => <tr key={r.id}><td>{state.courses.find(c => c.id === r.courseId)?.title}</td><td>{r.recipient}</td><td>{money(r.amountCents)} MXN</td><td><span className="trial-label">Sin cobro</span></td></tr>)}</tbody></table></div> : <p className="family-muted">Tus inscripciones aparecerán aquí cuando confirmes un curso.</p>}</details></>}</>;
}
