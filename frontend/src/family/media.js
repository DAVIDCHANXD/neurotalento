const photo = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
export const subjectPhotos = {
  math: { src: photo('photo-1560806887-1e4cd0b6cbd6'), alt: 'Manzanas para relacionar objetos y cantidades' },
  spanish: { src: photo('photo-1507842217343-583bb7270b66'), alt: 'Estanterías con libros para descubrir nuevas historias' },
  science: { src: photo('photo-1416879595882-3373a0480b5b'), alt: 'Plantas y materiales de jardinería' },
  art: { src: photo('photo-1513364776144-60967b0f800f'), alt: 'Pinceles y materiales para pintar' },
  english: { src: photo('photo-1455390582262-044cdead277a'), alt: 'Cuaderno abierto para aprender palabras' },
};
export function videoSource(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const id = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host) ? (url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1]) : null;
    if (id && /^[\w-]{11}$/.test(id)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, url: `https://www.youtube.com/watch?v=${id}` };
    if (/\.(mp4|webm)$/i.test(url.pathname)) return { kind: 'file', src: url.href, url: url.href };
  } catch { /* Invalid URLs are rejected by the course form. */ }
  return null;
}
export function courseVideo(course) {
  return course?.videoUrl ?? (course?.id === 'contamos-1-5' ? 'https://www.youtube.com/watch?v=-cfbXnv_3CY' : '');
}
export function validateMedia(values) {
  const videoUrl = String(values.videoUrl || '').trim();
  const imageUrl = String(values.imageUrl || '').trim();
  if (videoUrl && !videoSource(videoUrl)) throw new Error('Usa un enlace HTTPS de YouTube o un archivo MP4 o WebM.');
  if (imageUrl) {
    let url;
    try { url = new URL(imageUrl); } catch { throw new Error('Escribe un enlace HTTPS válido para la fotografía.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Escribe un enlace HTTPS válido para la fotografía.');
  }
  return { videoUrl, imageUrl };
}
