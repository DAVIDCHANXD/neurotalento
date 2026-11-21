import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { categories, initialDemoState } from '../data/demo';
const Context = createContext(null);
const clone = v => JSON.parse(JSON.stringify(v));
export function PlatformProvider({ children }) {
  const { mode, user } = useAuth();
  const [state, setState] = useState(() => { try { return JSON.parse(localStorage.getItem('nt-demo-v1')) || clone(initialDemoState); } catch { return clone(initialDemoState); } });
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem('nt-favorites')) || []; } catch { return []; } });
  const [toast, setToast] = useState('');
  useEffect(() => { localStorage.setItem('nt-demo-v1', JSON.stringify(state)); }, [state]);
  useEffect(() => { localStorage.setItem('nt-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); } }, [toast]);
  const isDemo = mode === 'demo';
  const courseOf = id => state.courses.find(c => c.id === id);
  const withCourse = e => ({ ...e, course: courseOf(e.courseId) });
  const ownEnrollments = () => state.enrollments.filter(e => e.studentId === user?.id).map(withCourse);
  const service = {
    async catalog(filters = {}) {
      if (!isDemo) return api(`/courses?${new URLSearchParams(Object.entries(filters).filter(([,v]) => v !== '' && v != null))}`);
      return state.courses.filter(c => c.status === 'PUBLISHED' && (!filters.categoryId || c.categoryId === filters.categoryId) && (!filters.creatorId || c.creatorId === filters.creatorId) && (!filters.search || `${c.title} ${c.description}`.toLowerCase().includes(filters.search.toLowerCase())));
    },
    categories: () => isDemo ? Promise.resolve(categories) : api('/categories'),
    async course(id) {
      if (!isDemo) return api(`/courses/${id}`);
      const course = courseOf(id);
      if (!course) throw new Error('No encontramos este curso.');
      return clone(course);
    },
    async enrollments() {
      if (isDemo) return ownEnrollments();
      const rows = await api('/enrollments/my-courses');
      return Promise.all(rows.map(row => api(`/enrollments/${row.id}`)));
    },
    async enrollment(id) {
      if (!isDemo) return api(`/enrollments/${id}`);
      const row = ownEnrollments().find(e => e.id === id);
      if (!row) throw new Error('No encontramos esa inscripción en tu cuenta.');
      return clone(row);
    },
    async checkout(courseId) {
      if (!isDemo) return api('/payments/checkout', { method: 'POST', body: { courseId } });
      const course = courseOf(courseId);
      if (!course || course.status !== 'PUBLISHED') throw new Error('El curso no está disponible.');
      if (user?.role !== 'STUDENT') throw new Error('Usa una cuenta de estudiante para inscribirte.');
      if (ownEnrollments().some(e => e.courseId === courseId)) throw new Error('Ya estás inscrito en este curso.');
      const enrollment = { id: crypto.randomUUID(), studentId: user.id, courseId, status: 'ACTIVE', enrolledAt: new Date().toISOString(), progress: [] };
      const commissionCents = Math.floor((course.priceCents * 15 + 50) / 100);
      const purchase = { id: crypto.randomUUID(), studentId: user.id, courseId, course: { id: courseId, title: course.title }, amountCents: course.priceCents, commissionCents, creatorAmountCents: course.priceCents - commissionCents, currency: course.currency, status: 'SUCCESS', createdAt: new Date().toISOString() };
      setState(s => ({ ...s, enrollments: [...s.enrollments, enrollment], purchases: [...s.purchases, purchase] }));
      return { enrollment: withCourse(enrollment), purchase };
    },
    async progress(id, lessonId, completed) {
      if (!isDemo) return api(`/enrollments/${id}/progress`, { method: 'PATCH', body: { lessonId, completed } });
      const row = ownEnrollments().find(e => e.id === id);
      if (!row || !row.course.modules.some(m => m.lessons.some(l => l.id === lessonId))) throw new Error('La lección no pertenece a tu curso.');
      const progress = [...row.progress.filter(p => p.lessonId !== lessonId), { lessonId, completed }];
      const total = row.course.modules.flatMap(m => m.lessons).length;
      const updated = { ...row, progress, status: progress.filter(p => p.completed).length === total ? 'COMPLETED' : 'ACTIVE' };
      delete updated.course;
      setState(s => ({ ...s, enrollments: s.enrollments.map(e => e.id === id ? updated : e) }));
      return withCourse(updated);
    },
    async studentDashboard() {
      if (!isDemo) return api('/dashboard/student');
      const rows = ownEnrollments();
      const total = rows.reduce((n,e) => n + e.course.modules.flatMap(m => m.lessons).length, 0);
      const done = rows.reduce((n,e) => n + e.progress.filter(p => p.completed).length, 0);
      return { totalCourses: rows.length, completedCourses: rows.filter(e => e.status === 'COMPLETED').length, inProgressCourses: rows.filter(e => e.status !== 'COMPLETED' && e.progress.some(p => p.completed)).length, overallProgress: total ? Math.round(done / total * 100) : 0 };
    },
    async creatorDashboard() {
      if (!isDemo) return api('/dashboard/creator');
      const courses = state.courses.filter(c => c.creatorId === user?.id);
      const sales = state.purchases.filter(p => courses.some(c => c.id === p.courseId));
      const enrollments = state.enrollments.filter(e => courses.some(c => c.id === e.courseId));
      return { courses, totalCourses: courses.length, publishedCourses: courses.filter(c => c.status === 'PUBLISHED').length, totalStudents: new Set(enrollments.map(e => e.studentId)).size, totalEnrollments: enrollments.length, totalSales: sales.length, earnings: sales.length ? [{ currency: 'MXN', grossCents: sales.reduce((n,p) => n + p.amountCents, 0), commissionCents: sales.reduce((n,p) => n + p.commissionCents, 0), netCents: sales.reduce((n,p) => n + p.creatorAmountCents, 0) }] : [], topCourses: [] };
    },
    async saveCourse(values, id) {
      if (!isDemo) return api(id ? `/courses/${id}` : '/courses', { method: id ? 'PUT' : 'POST', body: values });
      const updated = { ...(id ? courseOf(id) : { id: crypto.randomUUID(), creatorId: user.id, creator: { name: user.name }, status: 'DRAFT', modules: [], art: 'code', color: '#e9e5ff' }), ...values, category: categories.find(c => c.id === values.categoryId) };
      setState(s => ({ ...s, courses: id ? s.courses.map(c => c.id === id ? updated : c) : [...s.courses, updated] }));
      return updated;
    },
    async publish(id) {
      if (!isDemo) return api(`/courses/${id}/publish`, { method: 'PATCH', body: {} });
      const course = courseOf(id);
      if (!course?.modules.length || course.modules.some(m => !m.lessons.length)) throw new Error('Agrega al menos un módulo y una lección en cada módulo para publicar.');
      setState(s => ({ ...s, courses: s.courses.map(c => c.id === id ? { ...c, status: 'PUBLISHED' } : c) }));
    },
    async archive(id) {
      if (!isDemo) return api(`/courses/${id}`, { method: 'DELETE' });
      setState(s => ({ ...s, courses: s.courses.map(c => c.id === id ? { ...c, status: 'ARCHIVED' } : c) }));
    },
    async addModule(courseId, values) {
      if (!isDemo) return api(`/courses/${courseId}/modules`, { method: 'POST', body: values });
      const course = courseOf(courseId);
      if (course.modules.some(m => m.position === values.position)) throw new Error('Esa posición ya está ocupada.');
      const module = { id: crypto.randomUUID(), ...values, lessons: [] };
      setState(s => ({ ...s, courses: s.courses.map(c => c.id === courseId ? { ...c, modules: [...c.modules, module] } : c) }));
      return module;
    },
    async addLesson(moduleId, values) {
      if (!isDemo) return api(`/modules/${moduleId}/lessons`, { method: 'POST', body: values });
      const course = state.courses.find(c => c.modules.some(m => m.id === moduleId));
      const module = course?.modules.find(m => m.id === moduleId);
      if (!module || module.lessons.some(l => l.position === values.position)) throw new Error('El módulo no existe o la posición está ocupada.');
      const lesson = { id: crypto.randomUUID(), ...values };
      setState(s => ({ ...s, courses: s.courses.map(c => c.id === course.id ? { ...c, modules: c.modules.map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m) } : c), enrollments: s.enrollments.map(e => e.courseId === course.id ? { ...e, status: 'ACTIVE' } : e) }));
      return lesson;
    },
    async editContent(kind, id, values, remove = false) {
      if (!isDemo) return api(`/${kind === 'module' ? 'modules' : 'lessons'}/${id}`, { method: remove ? 'DELETE' : 'PUT', ...(remove ? {} : { body: values }) });
      const course = state.courses.find(c => c.modules.some(m => kind === 'module' ? m.id === id : m.lessons.some(l => l.id === id)));
      if (!course || course.creatorId !== user.id) throw new Error('Solo puedes modificar contenido de tus cursos.');
      if (remove && (course.status !== 'DRAFT' || state.enrollments.some(e => e.courseId === course.id))) throw new Error('Solo puedes eliminar contenido de borradores sin inscritos.');
      if (!remove) {
        const siblings = kind === 'module' ? course.modules : course.modules.find(m => m.lessons.some(l => l.id === id)).lessons;
        if (siblings.some(v => v.id !== id && v.position === values.position)) throw new Error('Esa posición ya está ocupada.');
      }
      const modules = kind === 'module' ? (remove ? course.modules.filter(m => m.id !== id) : course.modules.map(m => m.id === id ? { ...m, ...values } : m)) : course.modules.map(m => ({ ...m, lessons: remove ? m.lessons.filter(l => l.id !== id) : m.lessons.map(l => l.id === id ? { ...l, ...values } : l) }));
      modules.sort((a,b) => a.position - b.position).forEach(m => m.lessons.sort((a,b) => a.position - b.position));
      setState(s => ({ ...s, courses: s.courses.map(c => c.id === course.id ? { ...c, modules } : c) }));
    },
    history: () => isDemo ? Promise.resolve(state.purchases.filter(p => p.studentId === user?.id)) : api('/payments/history'),
    reviews: courseId => isDemo ? Promise.resolve(state.reviews.filter(r => r.courseId === courseId)) : api(`/courses/${courseId}/reviews`),
    async review(courseId, values) {
      if (!isDemo) return api(`/courses/${courseId}/reviews`, { method: 'POST', body: values });
      if (!ownEnrollments().some(e => e.courseId === courseId)) throw new Error('Necesitas estar inscrito para dejar una opinión.');
      if (state.reviews.some(r => r.courseId === courseId && r.studentId === user.id)) throw new Error('Ya compartiste tu opinión sobre este curso.');
      const review = { id: crypto.randomUUID(), courseId, studentId: user.id, student: { name: user.name }, ...values };
      setState(s => ({ ...s, reviews: [...s.reviews, review] }));
      return review;
    },
  };
  return <Context.Provider value={{ service, favorites, isFavorite: id => favorites.includes(id), toggleFavorite: id => setFavorites(s => s.includes(id) ? s.filter(v => v !== id) : [...s,id]), notify: setToast, toast, dismissToast: () => setToast('') }}>{children}</Context.Provider>;
}
export const usePlatform = () => useContext(Context);
