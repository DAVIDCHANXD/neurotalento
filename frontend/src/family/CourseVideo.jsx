import { useState } from 'react';
import { videoSource } from './media';

export default function CourseVideo({ url, title }) {
  const [opened, setOpened] = useState(false);
  const source = videoSource(url);
  if (!source) return null;
  if (source.kind === 'youtube') return <section className="course-video" aria-label={`Video de ${title}`}><a className="video-start" href={source.url} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">▶</span><strong>Ver explicación en video</strong><small>Abre YouTube · tu avance queda aquí</small></a></section>;
  return <section className="course-video" aria-label={`Video de ${title}`}>
    {!opened ? <button type="button" className="video-start" onClick={() => setOpened(true)}><span aria-hidden="true">▶</span><strong>Ver explicación en video</strong><small>Opcional · puedes practicar directamente</small></button> : <>
      <video src={source.src} controls preload="metadata" aria-label={title} />
      <a className="family-text-link" href={source.url} target="_blank" rel="noopener noreferrer">Abrir video en otra pestaña</a>
    </>}
  </section>;
}
