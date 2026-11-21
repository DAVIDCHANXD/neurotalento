import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Save, Trash2 } from 'lucide-react';
import { useFamily } from './FamilyContext';
import { courseVideo, validateMedia } from './media';
import { activityFor, LEVELS, validateQuestions } from './model';
import { ErrorMessage, PageHeading, SupportChecks } from './ui';
import SubjectCreator from './SubjectCreator';
import PracticePreview from './PracticePreview';
import LearningVisual, { VISUAL_OPTIONS } from './LearningVisual';

const newQuestion = () => ({ id: crypto.randomUUID(), prompt: '', visual: 'none', choices: ['', ''], correctIndex: 0, hint: '' });
const templateLabels = { choice: 'Mis propias preguntas', count: 'Contar objetos', sum: 'Sumar dos grupos', read: 'Relacionar imagen y palabra' };

export default function CourseBuilder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state, session, act } = useFamily();
  const navigate = useNavigate();
  const course = state.courses.find(c => c.id === id && c.creatorId === session.id);
  const [step, setStep] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState('');
  const [v, setV] = useState(() => ({
    videoUrl: courseVideo(course), imageUrl: course?.imageUrl || '', title: course?.title || '', subjectId: course?.subjectId || (state.subjects.some(s => s.id === params.get('materia')) ? params.get('materia') : state.subjects[0]?.id) || '',
    level: course?.level || 'PRESCHOOL', objective: course?.objective || '',
    description: course?.description || '', price: course ? String(course.priceCents / 100) : '99',
    kind: course?.activity.kind || 'choice',
    numbers: ['count', 'sum'].includes(course?.activity.kind) ? course.activity.questions.map(q => q.count ?? q.left) : [2, 3, 5],
    questions: course?.activity.kind === 'choice' ? structuredClone(course.activity.questions) : [newQuestion()],
    instruction: course?.activity.instruction || 'Observa y elige.',
    hint: course?.activity.hint || 'Mira con calma y vuelve a intentar.',
    supports: course?.supports || ['visuals', 'repeat', 'breaks'], pauseEvery: course?.pauseEvery || 2,
  }));
  const question = v.questions[questionIndex];
  const change = (key, value) => setV(old => ({ ...old, [key]: value }));
  function updateQuestion(changes) {
    change('questions', v.questions.map((q, i) => i === questionIndex ? { ...q, ...changes } : q));
    setError('');
  }
  function template(kind) {
    const defaults = kind === 'choice' ? { instruction: 'Observa y elige.', hint: 'Mira con calma y vuelve a intentar.' } : activityFor(kind);
    setV(old => ({ ...old, kind, instruction: defaults.instruction, hint: defaults.hint }));
    setError('');
  }
  function addQuestion() {
    try {
      validateQuestions([question]);
      change('questions', [...v.questions, newQuestion()]);
      setQuestionIndex(v.questions.length);
      setError('');
    } catch (e) { setError(e.message); }
  }
  function removeQuestion() {
    change('questions', v.questions.filter((_, i) => i !== questionIndex));
    setQuestionIndex(Math.max(0, questionIndex - 1));
    setError('');
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (step === 0) validateMedia(v);
      if (step === 1 && v.kind === 'choice') validateQuestions(v.questions);
      if (step < 2) { setStep(s => s + 1); window.scrollTo(0, 0); return; }
      if (!/^\d+(?:\.\d{1,2})?$/.test(v.price)) throw new Error('Escribe un precio válido, con hasta dos decimales.');
      await act({ type: 'SAVE_COURSE', id, values: { ...v, description: v.description.trim() || v.objective, priceCents: Math.round(Number(v.price) * 100) } });
      navigate('/docente?seccion=courses');
    } catch (e) { setError(e.message); }
  }
  if (id && !course) return <div className="family-empty"><h1>No puedes editar este curso.</h1><button className="family-button" onClick={() => navigate('/docente')}>Volver a mis cursos</button></div>;

  const previewActivity = v.kind === 'choice' ? { kind: 'choice', instruction: v.instruction, questions: v.questions } : activityFor(v.kind, v.numbers);
  const previewQuestion = v.kind === 'choice' ? question : previewActivity.questions[0];
  const canPreview = v.kind === 'choice' ? question.prompt && question.choices.every(Boolean) : v.kind === 'read' || v.numbers.every(n => Number.isInteger(n) && n >= 1 && n <= 5);
  return <>
    <PageHeading title={course ? 'Editar curso' : 'Crea tu próximo curso'} description={`Paso ${step + 1} de 3 · ${['Curso y materia', 'Actividad', 'Apoyos'][step]}`} back="/docente" />
    <form className="course-builder" onSubmit={submit}>
      <div className="builder-fields">
        {step === 0 && <section>
          <label>Nombre del curso<input value={v.title} onChange={e => change('title', e.target.value)} required minLength={3} maxLength={100} placeholder="¿Qué van a aprender?" /></label>
          <div className="subject-field"><label>Materia<select value={v.subjectId} onChange={e => change('subjectId', e.target.value)} required>{state.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><SubjectCreator inline onCreate={subject => change('subjectId', subject.id)} /></div>
          <div className="family-form-grid">
            <label>Nivel<select value={v.level} onChange={e => change('level', e.target.value)}>{Object.entries(LEVELS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
            <label>Inscripción (MXN)<input type="number" value={v.price} onChange={e => change('price', e.target.value)} required min={0} max={10000} step="0.01" /></label>
          </div>
          <label>Objetivo<input value={v.objective} onChange={e => change('objective', e.target.value)} required minLength={5} maxLength={160} placeholder="Por ejemplo: reconocer sonidos de instrumentos" /></label>
          <details className="builder-extra"><summary>Fotografía y video (opcional)</summary><label>Enlace de la fotografía<input type="url" value={v.imageUrl} onChange={e => change('imageUrl', e.target.value)} placeholder="https://…" maxLength={2000} /></label><label>Enlace del video<input type="url" value={v.videoUrl} onChange={e => change('videoUrl', e.target.value)} placeholder="YouTube o archivo MP4 / WebM" maxLength={2000} /></label><p className="field-note">Usa materiales propios o con permiso. Si no añades una foto, se usará la de la materia.</p></details><details className="builder-extra"><summary>Añadir una descripción</summary><label>Descripción<textarea value={v.description} onChange={e => change('description', e.target.value)} maxLength={500} rows={2} /></label></details>
        </section>}
        {step === 1 && <section>
          <label>Tipo de actividad<select value={v.kind} onChange={e => template(e.target.value)}>{Object.entries(templateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          {v.kind === 'choice' ? <>
            <div className="question-navigation" role="group" aria-label="Ejercicios del curso">
              {v.questions.map((q, i) => <button key={q.id} type="button" aria-pressed={questionIndex === i} className={questionIndex === i ? 'selected' : ''} onClick={() => { setQuestionIndex(i); setError(''); }}>{i + 1}</button>)}
              {v.questions.length < 5 && <button type="button" onClick={addQuestion} aria-label="Agregar ejercicio"><Plus size={18} /></button>}
              <span>{v.questions.length} / 5 ejercicios</span>
            </div>
            <label>Pregunta<input value={question.prompt} onChange={e => updateQuestion({ prompt: e.target.value })} required minLength={3} maxLength={100} placeholder="Escribe una pregunta breve" /></label>
            <label>Apoyo visual<select value={question.visual} onChange={e => updateQuestion({ visual: e.target.value })}>{Object.entries(VISUAL_OPTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <fieldset className="question-options"><legend>Respuestas · marca la correcta</legend>
              {question.choices.map((choice, i) => <div className="question-option" key={i}>
                <input type="radio" name={`correct-${question.id}`} checked={question.correctIndex === i} onChange={() => updateQuestion({ correctIndex: i })} aria-label={`Opción ${i + 1} es correcta`} />
                <input value={choice} aria-label={`Opción ${i + 1}`} onChange={e => updateQuestion({ choices: question.choices.map((c, index) => index === i ? e.target.value : c) })} required maxLength={36} placeholder={`Respuesta ${i + 1}`} />
              </div>)}
            </fieldset>
            <div className="question-tools">
              <button type="button" className="family-text-link" onClick={() => updateQuestion({ choices: question.choices.length === 2 ? [...question.choices, ''] : question.choices.slice(0, 2), correctIndex: question.correctIndex === 2 ? 0 : question.correctIndex })}>{question.choices.length === 2 ? 'Añadir tercera opción' : 'Usar solo dos opciones'}</button>
              {v.questions.length > 1 && <button type="button" className="family-text-link danger-link" onClick={removeQuestion}><Trash2 size={15} />Quitar ejercicio</button>}
            </div>
            <label>Pista <span className="optional">(opcional)</span><input value={question.hint || ''} onChange={e => updateQuestion({ hint: e.target.value })} maxLength={180} placeholder="Una ayuda para volver a intentar" /></label>
          </> : <>
            <label>Instrucción<input value={v.instruction} onChange={e => change('instruction', e.target.value)} required minLength={5} maxLength={120} /></label>
            {v.kind !== 'read' ? <div className="exercise-quantities">{v.numbers.map((n, i) => <label key={i}>Ejercicio {i + 1}<input type="number" value={Number.isNaN(n) ? '' : n} min={1} max={5} step={1} required onChange={e => change('numbers', v.numbers.map((old, index) => index === i ? e.target.value === '' ? NaN : Number(e.target.value) : old))} /></label>)}</div> : <p className="field-note">Plantilla: sol, casa y luna. Para usar tus propias palabras elige “Mis propias preguntas”.</p>}
            {v.kind === 'sum' && <p className="field-note">Cantidades del primer grupo. El segundo tendrá 1, 1 y 2 objetos.</p>}
            <label>Pista<input value={v.hint} onChange={e => change('hint', e.target.value)} required minLength={5} maxLength={180} /></label>
          </>}
        </section>}
        {step === 2 && <section><h2>¿Qué apoyos tendrá?</h2><SupportChecks value={v.supports} onChange={value => change('supports', value)} /><label>Sugerir una pausa después de<select value={v.pauseEvery} onChange={e => change('pauseEvery', Number(e.target.value))}><option value={1}>Cada ejercicio</option><option value={2}>Dos ejercicios</option><option value={3}>Tres ejercicios</option></select></label><p className="field-note">Después podrás ajustar estos apoyos para cada alumno.</p></section>}
        <ErrorMessage>{error}</ErrorMessage>
        <div className="family-actions">{step > 0 && <button type="button" className="family-button secondary" onClick={() => { setStep(s => s - 1); setError(''); }}><ArrowLeft size={17} />Atrás</button>}<button className="family-button" type="submit">{step === 2 ? <><Save size={18} />Guardar borrador</> : <>Continuar<ArrowRight size={18} /></>}</button></div>
      </div>
      <aside className="activity-preview"><span className="preview-caption">Prueba tu actividad</span>{canPreview ? <PracticePreview key={JSON.stringify(previewQuestion)} activity={previewActivity} question={previewQuestion} compact /> : <div className="empty-preview"><LearningVisual name={question.visual === 'none' ? 'book' : question.visual} size={74} /><p>Escribe una pregunta y sus respuestas para probarla aquí.</p></div>}</aside>
    </form>
  </>;
}
