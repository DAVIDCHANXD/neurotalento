import { Apple, BookOpen, Cat, Circle, Fish, House, Leaf, Moon, Square, Sun, Triangle } from 'lucide-react';
export const VISUAL_OPTIONS = {
  none: 'Sin imagen', apple: 'Manzana', sun: 'Sol', moon: 'Luna', house: 'Casa', leaf: 'Planta',
  cat: 'Gato', fish: 'Pez', book: 'Libro', red: 'Color rojo', yellow: 'Color amarillo', blue: 'Color azul',
  circle: 'Círculo', triangle: 'Triángulo', square: 'Cuadrado',
};
const icons = { apple: Apple, sun: Sun, moon: Moon, house: House, leaf: Leaf, cat: Cat, fish: Fish, book: BookOpen, circle: Circle, triangle: Triangle, square: Square };
export default function LearningVisual({ name = 'book', size = 90 }) {
  if (name === 'none') return null;
  if (['red', 'yellow', 'blue'].includes(name)) return <span className={`learning-color color-${name}`} style={{ width: size, height: size }} role="img" aria-label={VISUAL_OPTIONS[name]} />;
  const Icon = icons[name] || BookOpen;
  return <span className={`learning-visual visual-${name}`} role="img" aria-label={VISUAL_OPTIONS[name] || 'Libro'}><Icon width={size} height={size} strokeWidth={1.5} aria-hidden="true" /></span>;
}
