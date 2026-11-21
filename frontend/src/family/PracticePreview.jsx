import { useState } from 'react';
import { Apple, Check, RotateCcw } from 'lucide-react';
import LearningVisual from './LearningVisual';
import { answerFor, choicesFor } from './model';

export default function PracticePreview({ activity, question, compact = false }) {
  const [answer, setAnswer] = useState(null);
  const correct = answer === answerFor(activity, question);
  const choices = choicesFor(activity, question);
  const hasVisual = activity.kind !== 'choice' || question.visual !== 'none';
  return <div className={`practice-preview ${compact ? 'practice-compact' : ''}`}>
    <h2>{question.prompt || activity.instruction}</h2>
    {hasVisual && <div className="practice-visual">{activity.kind === 'count' ? <div className="practice-apples" role="img" aria-label={`${question.count} manzanas`}>{Array.from({ length: question.count }, (_, i) => <Apple key={i} aria-hidden="true" />)}</div> : activity.kind === 'sum' ? <span className="preview-equation">{question.left} + {question.right}</span> : <LearningVisual name={question.visual || (activity.kind === 'read' ? ({ sol: 'sun', luna: 'moon', casa: 'house' }[question.word]) : 'book')} size={76} />}</div>}
    <div className="practice-answers" role="group" aria-label="Prueba una respuesta">{choices.map(value => <button key={value} type="button" disabled={correct} className={answer === value ? correct ? 'is-correct' : 'try-again' : ''} onClick={() => setAnswer(value)}>{value}{correct && answer === value && <Check size={17} />}</button>)}</div>
    <div className="practice-feedback" role="status">{answer !== null ? correct ? '¡Lo encontraste!' : 'Prueba otra vez.' : 'Toca una respuesta.'}{correct && <button type="button" aria-label="Volver a probar" onClick={() => setAnswer(null)}><RotateCcw size={16} /></button>}</div>
  </div>;
}
