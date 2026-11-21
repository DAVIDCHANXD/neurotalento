import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFamily } from './FamilyContext';
import { ErrorMessage } from './ui';

export default function SubjectCreator({ onCreate, inline = false }) {
  const { act } = useFamily();
  const [open, setOpen] = useState(!inline);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  function create() {
    setError('');
    try {
      const subject = act({ type: 'CREATE_SUBJECT', name });
      setName('');
      if (inline) setOpen(false);
      onCreate?.(subject);
    } catch (e) { setError(e.message); }
  }
  return open ? <div className="subject-creator"><label>Nueva materia<input value={name} onChange={e => setName(e.target.value)} maxLength={45} placeholder="Por ejemplo: Música" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create(); } }} /></label><div className="family-actions"><button className="family-button secondary compact" type="button" onClick={create}>Crear materia</button>{inline && <button className="family-text-link" type="button" onClick={() => { setOpen(false); setError(''); }}>Cancelar</button>}</div><ErrorMessage>{error}</ErrorMessage></div> : <button className="family-text-link" type="button" onClick={() => setOpen(true)}><Plus size={15} />Nueva materia</button>;
}
