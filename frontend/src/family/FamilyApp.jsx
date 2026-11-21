import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FamilyProvider } from './FamilyContext';
import { FamilyShell, RequireAdult } from './ui';
import { FamilyCatalog, FamilyCourse, FamilyLogin, Welcome } from './PublicPages';
import TutorPage from './TutorPage';
import TeacherPage from './TeacherPage';
import CourseBuilder from './CourseBuilder';
import ChildActivity from './ChildActivity';
import './family.css';

export default function FamilyApp() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); document.title = `${pathname.startsWith('/actividad') ? 'Un paso a la vez' : pathname.startsWith('/docente') ? 'Espacio docente' : pathname === '/familia' ? 'Mi familia' : pathname === '/catalogo' ? 'Preescolar y primaria' : 'Aprender con acompañamiento'} · NeuroTalento`; }, [pathname]);
  return <FamilyProvider><FamilyShell><Routes>
    <Route path="/" element={<Welcome />} />
    <Route path="/login" element={<FamilyLogin />} /><Route path="/registro" element={<FamilyLogin />} />
    <Route path="/catalogo" element={<FamilyCatalog />} /><Route path="/cursos/:id" element={<FamilyCourse />} />
    <Route path="/familia" element={<RequireAdult role="TUTOR"><TutorPage /></RequireAdult>} />
    <Route path="/docente" element={<RequireAdult role="TEACHER"><TeacherPage /></RequireAdult>} />
    <Route path="/docente/nuevo" element={<RequireAdult role="TEACHER"><CourseBuilder /></RequireAdult>} />
    <Route path="/docente/cursos/:id" element={<RequireAdult role="TEACHER"><CourseBuilder /></RequireAdult>} />
    <Route path="/actividad/:id" element={<RequireAdult role="TUTOR"><ChildActivity /></RequireAdult>} />
    <Route path="/aprendizaje" element={<Navigate to="/familia" replace />} />
    <Route path="/creador/*" element={<Navigate to="/docente" replace />} />
    <Route path="/perfil" element={<Navigate to="/familia" replace />} />
    <Route path="*" element={<div className="family-empty"><h1>Volvamos a un lugar conocido.</h1><Link className="family-button" to="/">Ir al inicio</Link></div>} />
  </Routes></FamilyShell></FamilyProvider>;
}
