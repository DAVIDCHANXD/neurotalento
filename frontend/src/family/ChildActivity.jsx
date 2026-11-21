import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Apple, ArrowLeft, ArrowRight, Check, HelpCircle, House, Leaf, Moon, RotateCcw, Sun } from 'lucide-react';
import { useFamily } from './FamilyContext';
import { answerFor, choicesFor } from './model';
import CourseVideo from './CourseVideo';
import { courseVideo } from './media';
import LearningVisual from './LearningVisual';

function Apples({ count, color = 'red', numbered = false }) {
  return <div className={`learning-apples apples-${color}`} role="img" aria-label={`${count} ${count === 1 ? 'manzana' : 'manzanas'}`}>{Array.from({ length: count }, (_, i) => <span key={i}><Apple aria-hidden="true" strokeWidth={1.5} />{numbered && <small aria-hidden="true">{i + 1}</small>}</span>)}</div>;
}
export default function ChildActivity() {
  const { id } = useParams(); const { state, session, act } = useFamily();
  const enrollment = state.enrollments.find(e => e.id === id && e.tutorId === session.id);
  const child = state.children.find(c => c.id === enrollment?.childId && c.tutorId === session.id);
  const [index, setIndex] = useState(() => Math.max(0, enrollment?.activity.questions.findIndex(q => !enrollment.completed.includes(q.id)) ?? 0));
  const [done, setDone] = useState(() => !!enrollment && enrollment.completed.length === enrollment.activity.questions.length);
  const [mode, setMode] = useState('practice');
  const [sumStage, setSumStage] = useState(0); const [correct, setCorrect] = useState(false); const [feedback, setFeedback] = useState(''); const [hint, setHint] = useState(false); const [paused, setPaused] = useState(false); const [suggestPause, setSuggestPause] = useState(false);
  if (!enrollment || !child) return <div className="child-unavailable"><h1>Esta actividad no está disponible.</h1><p>Pide a tu tutor que abra tu curso.</p><Link className="family-button" to="/familia">Volver con mi tutor</Link></div>;
  const videoUrl = enrollment.videoUrl ?? courseVideo(state.courses.find(c => c.id === enrollment.courseId));
  const activity = enrollment.activity; const question = activity.questions[index]; const isSum = activity.kind === 'sum';
  function answer(value) {
    if (correct) return;
    if (value !== answerFor(activity, question)) { setHint(true); setFeedback('Puedes volver a intentar.'); return; }
    try { act({ type: 'ANSWER', enrollmentId: enrollment.id, questionId: question.id, answer: value }); setCorrect(true); setFeedback('Lo encontraste. Un paso más.'); } catch (e) { setFeedback(e.message); }
  }
  function next() {
    if (index === activity.questions.length - 1) { setDone(true); return; }
    setIndex(i => i + 1); setCorrect(false); setHint(false); setFeedback(''); setSumStage(0);
    if (enrollment.supports.includes('breaks') && (index + 1) % enrollment.pauseEvery === 0) setSuggestPause(true);
  }
  function repeat() { setIndex(0); setSumStage(0); setDone(false); setCorrect(false); setFeedback(''); setHint(false); setPaused(false); setSuggestPause(false); }
  const showChoices = !isSum || sumStage === 2;
  const instruction = isSum ? sumStage === 0 ? 'Cuenta el primer grupo.' : sumStage === 1 ? 'Cuenta el segundo grupo.' : activity.instruction : activity.kind === 'choice' ? question.prompt : activity.instruction;
  const WordIcon = question.word === 'casa' ? House : question.word === 'luna' ? Moon : Sun;
  return <><header className="child-header"><Link to="/familia"><ArrowLeft size={19} /><span>Con mi tutor</span></Link><span>{child.nickname}</span>{!done && <button onClick={() => setPaused(true)}><Leaf size={20} />Una pausa</button>}</header><main className="child-main">{videoUrl && !paused && !suggestPause && <div className="lesson-tabs" role="group" aria-label="Cómo quieres aprender"><button aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>Practicar</button><button aria-pressed={mode === 'video'} onClick={() => setMode('video')}>Ver video</button></div>}
    {mode === 'video' && !paused && !suggestPause ? <section className="child-video"><h1>{enrollment.courseTitle}</h1><CourseVideo url={videoUrl} title={enrollment.courseTitle} /><button className="family-button child-primary" onClick={() => setMode('practice')}>Ir a la práctica<ArrowRight size={20} /></button></section> : done ? <section className="child-finish"><div className="child-finish-mark"><Check size={40} /></div><h1>Lo hiciste, {child.nickname}.</h1><p>{activity.questions.length === 1 ? 'Terminaste el ejercicio.' : `Terminaste los ${activity.questions.length} ejercicios.`}<br />Tu avance quedó guardado.</p><Link className="family-button child-primary" to="/familia">Volver con mi tutor<ArrowRight size={22} /></Link><button className="child-text-button" onClick={repeat}><RotateCcw size={19} />Practicar otra vez</button><p className="child-gentle-note">Repetir no borra tu avance.</p></section> : paused || suggestPause ? <section className="child-pause"><Leaf size={46} /><h1>{paused ? 'Un momento para ti.' : '¿Seguimos o descansamos?'}</h1><p>{paused ? 'Estírate o descansa con tu tutor. Vuelve cuando quieras.' : 'Ya diste un pequeño paso. Puedes tomar una pausa.'}</p><button className="family-button child-primary" onClick={() => { setPaused(false); setSuggestPause(false); }}>{paused ? 'Estoy listo para volver' : 'Quiero continuar'}<ArrowRight size={22} /></button>{!paused && <button className="child-text-button" onClick={() => setPaused(true)}><Leaf size={20} />Tomar una pausa</button>}<p className="child-gentle-note">Tu avance está guardado. No hay prisa.</p></section> : <section className="child-exercise" aria-labelledby="activity-instruction"><div className="child-progress"><span>Ejercicio {index + 1} de {activity.questions.length}</span><div aria-hidden="true">{activity.questions.map((q, i) => <span key={q.id} className={i === index ? 'current' : enrollment.completed.includes(q.id) ? 'completed' : ''} />)}</div></div><h1 id="activity-instruction">{instruction}</h1>{isSum ? <div className="sum-learning"><div className={sumStage === 1 ? 'muted-group' : ''}><Apples count={question.left} numbered={hint && enrollment.supports.includes('visuals')} /></div>{sumStage > 0 && <><span className="sum-plus" aria-hidden="true">+</span><Apples count={question.right} color="yellow" numbered={hint && enrollment.supports.includes('visuals')} /></>}{sumStage === 2 && <span className="sum-expression">{question.left} + {question.right} = ?</span>}</div> : activity.kind === 'choice' ? (question.visual !== 'none' ? <div className="reading-object"><LearningVisual name={question.visual} size={100} /></div> : null) : activity.kind === 'read' ? <div className="reading-object" role="img" aria-label={question.word}><WordIcon size={110} strokeWidth={1.5} aria-hidden="true" /></div> : <Apples count={question.count} numbered={hint && enrollment.supports.includes('visuals')} />}
      {showChoices ? <div className={`answer-options ${activity.kind === 'choice' || activity.kind === 'read' ? 'word-answers' : ''}`} role="group" aria-label="Elige tu respuesta">{choicesFor(activity, question).map(value => <button key={value} className={correct && value === answerFor(activity, question) ? 'correct-answer' : ''} disabled={correct} onClick={() => answer(value)} aria-label={`Respuesta ${value}`}>{value}{correct && value === answerFor(activity, question) && <Check size={22} aria-hidden="true" />}</button>)}</div> : <button className="family-button child-primary" onClick={() => { setSumStage(s => s + 1); setFeedback(''); }}>{sumStage === 0 ? 'Ver el otro grupo' : 'Juntar los grupos'}<ArrowRight size={22} /></button>}
      <div className={`child-feedback ${correct ? 'is-correct' : ''}`} role="status" aria-live="polite">{feedback && <p>{correct && <Check size={20} />}{feedback}</p>}{hint && !correct && <p>{question.hint || activity.hint}</p>}</div>{correct ? <button className="family-button child-primary" onClick={next}>{index === activity.questions.length - 1 ? 'Terminar actividad' : 'Siguiente paso'}<ArrowRight size={22} /></button> : <div className="child-helpers"><button onClick={() => { setHint(true); setFeedback('Mira con calma.'); }}><HelpCircle size={20} />Una pista</button><button onClick={() => { setFeedback(instruction); setHint(false); }}><RotateCcw size={20} />Repetir instrucción</button></div>}<p className="child-gentle-note">Puedes volver a intentar.</p></section>}
  </main></>;
}
