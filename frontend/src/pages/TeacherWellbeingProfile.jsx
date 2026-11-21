import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlatform } from '../context/PlatformContext';

const STORAGE_KEY = 'nt-teacher-wellbeing-draft';
const EMPTY_PROFILE = {
  specialties: '',
  teachingStyle: '',
  curiousFact: '',
  presentation: [],
  triggers: [],
  supports: [],
  privateNote: '',
  sharePreferences: false,
};

const GROUPS = [
  { key: 'presentation', title: 'Mi forma de enfocarme', options: ['Inatento', 'Hiperactivo / impulsivo', 'Combinado', 'Prefiero no especificar'] },
  { key: 'triggers', title: 'Situaciones que me cuestan en el aula', options: ['Ruido excesivo', 'Interrupciones', 'Cambios de horario sin aviso', 'Demasiadas notificaciones'] },
  { key: 'supports', title: 'Apoyos que prefiero en la plataforma', options: ['Recordatorios suaves', 'Pausas activas', 'Listas cortas', 'Alertas visuales sin sonido'] },
];

function readDraft(storageKey) {
  try {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? { ...EMPTY_PROFILE, ...JSON.parse(saved) } : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

export default function TeacherWellbeingProfile() {
  const { user } = useAuth();
  const { notify } = usePlatform();
  const storageKey = `${STORAGE_KEY}:${user.id || user.email || 'teacher'}`;
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(() => readDraft(storageKey));
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setSaved(false);
    const timeout = window.setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(profile));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [profile, storageKey]);

  const update = (key, value) => setProfile(current => ({ ...current, [key]: value }));
  const toggleChip = (key, value) => update(key, profile[key].includes(value) ? profile[key].filter(item => item !== value) : [...profile[key], value]);
  const finish = () => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(profile));
      setSaved(true);
      notify('El perfil quedó guardado en esta sesión, solo en este navegador.');
    } catch {
      notify('No se pudo guardar el borrador en esta sesión.');
    }
  };

  return <div className="page teacher-profile-page">
    <div className="page-heading teacher-profile-heading">
      <span className="eyebrow">TU ESPACIO, A TU MANERA</span>
      <h1>Mi perfil y bienestar docente</h1>
      <p>Comparte solo lo que te resulte útil. Puedes dejar cualquier respuesta sin completar.</p>
      <div className="teacher-save-status" role="status"><span className={saved ? 'saved-dot' : 'saving-dot'} />{saved ? 'Borrador guardado en esta sesión' : 'Guardando borrador en este navegador…'}</div>
    </div>

    <section className="teacher-wizard panel" aria-label="Formulario de perfil docente">
      <div className="wizard-progress-head"><span>Paso {step} de 3</span><span>{step === 1 ? 'Tu perfil' : step === 2 ? 'Preferencias de bienestar' : 'Privacidad'}</span></div>
      <div className="wizard-progress-track" role="progressbar" aria-label="Progreso del perfil" aria-valuemin="1" aria-valuemax="3" aria-valuenow={step}><span style={{ width: `${step * 33.333}%` }} /></div>
      <div className="wizard-step-labels" aria-hidden="true">{['Tu perfil', 'Bienestar', 'Privacidad'].map((label, index) => <span className={step === index + 1 ? 'current' : step > index + 1 ? 'complete' : ''} key={label}>{step > index + 1 ? <Check size={15} /> : index + 1}{label}</span>)}</div>

      {step === 1 && <div className="wizard-step" aria-labelledby="teacher-step-one">
        <div className="wizard-step-intro"><span className="value-icon sage"><BookOpen size={20} /></span><div><h2 id="teacher-step-one">Cuéntanos qué enseñas</h2><p>Respuestas breves bastan. Este paso también se puede completar después.</p></div></div>
        <label>¿Cuál es tu especialidad?<input value={profile.specialties} onChange={event => update('specialties', event.target.value)} maxLength={120} placeholder="Ej. Ciencias, lectura, programación" /></label>
        <label>¿Cómo te gusta enseñar?<textarea value={profile.teachingStyle} onChange={event => update('teachingStyle', event.target.value)} rows={3} maxLength={300} placeholder="Ej. Con ejemplos y actividades cortas" /></label>
        <label>Un dato curioso sobre ti <span className="optional-label">Opcional</span><input value={profile.curiousFact} onChange={event => update('curiousFact', event.target.value)} maxLength={120} placeholder="Algo que te guste compartir con tus estudiantes" /></label>
      </div>}

      {step === 2 && <div className="wizard-step" aria-labelledby="teacher-step-two">
        <div className="wizard-step-intro"><span className="value-icon peach"><ShieldCheck size={20} /></span><div><h2 id="teacher-step-two">Elige apoyos que te sirvan</h2><p>Es opcional y autodescrito. No es una evaluación ni sustituye una valoración profesional.</p></div></div>
        {GROUPS.map(group => <fieldset className="wellbeing-group" key={group.key}><legend>{group.title}</legend><div className="wellbeing-chips">{group.options.map(option => <button type="button" key={option} className={`wellbeing-chip ${profile[group.key].includes(option) ? 'selected' : ''}`} aria-pressed={profile[group.key].includes(option)} onClick={() => toggleChip(group.key, option)}>{profile[group.key].includes(option) && <Check size={15} />}{option}</button>)}</div></fieldset>)}
        <label>Nota personal breve <span className="optional-label">Opcional · siempre privada</span><textarea value={profile.privateNote} onChange={event => update('privateNote', event.target.value)} rows={3} maxLength={300} placeholder="Escribe solo lo que quieras tener presente" /></label>
      </div>}

      {step === 3 && <div className="wizard-step" aria-labelledby="teacher-step-three">
        <div className="wizard-step-intro"><span className="value-icon blue"><LockKeyhole size={20} /></span><div><h2 id="teacher-step-three">Tú decides qué compartir</h2><p>La opción más privada está elegida de forma predeterminada. Tus notas personales nunca se comparten.</p></div></div>
        <div className="privacy-choice"><div><strong>Perfil privado</strong><p>Las preferencias quedan visibles solo para ti.</p></div><span className={!profile.sharePreferences ? 'privacy-indicator active' : 'privacy-indicator'}>{!profile.sharePreferences ? 'Seleccionado' : 'Disponible'}</span></div>
        <label className="privacy-toggle-row"><span><strong>Compartir preferencias seleccionadas</strong><small>Permitir que otros docentes y estudiantes vean las etiquetas elegidas en el paso anterior.</small></span><button type="button" role="switch" aria-checked={profile.sharePreferences} className="privacy-switch" onClick={() => update('sharePreferences', !profile.sharePreferences)}><i aria-hidden="true" /></button></label>
        <p className="privacy-notice"><LockKeyhole size={17} /> En esta vista previa, las respuestas se guardan únicamente en la sesión de este navegador y no se envían ni se comparten con otras personas.</p>
      </div>}

      <div className="wizard-actions">
        <button type="button" className="btn btn-secondary" disabled={step === 1} onClick={() => setStep(current => current - 1)}><ArrowLeft size={17} />Anterior</button>
        <Link className="wizard-later" to="/creador">Completar más tarde</Link>
        {step < 3 ? <button type="button" className="btn btn-primary" onClick={() => setStep(current => current + 1)}>Continuar<ArrowRight size={17} /></button> : <button type="button" className="btn btn-primary" onClick={finish}><Save size={17} />Guardar preferencias</button>}
      </div>
    </section>
    <p className="teacher-profile-footnote">Los datos de bienestar son opcionales. Puedes borrar este borrador al cerrar la sesión del navegador.</p>
  </div>;
}
