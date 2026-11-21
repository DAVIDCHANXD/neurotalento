import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap } from 'lucide-react';
import Layout from './components/common/Layout';
import { Loading } from './components/common/ui';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import CourseDetail from './pages/CourseDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import CreatorDashboard from './pages/CreatorDashboard';
import CourseEditor from './pages/CourseEditor';
import Learn from './pages/Learn';
import Profile from './pages/Profile';
function Require({ role, children }){
  const {user,loading,mode,demo}=useAuth(),location=useLocation();
  if(loading)return <div className="page"><Loading/></div>;
  if(!user)return <div className="page access-page"><span className="value-icon lavender"><BookOpen size={28}/></span><h1>Tu camino necesita un lugar.</h1><p>Inicia sesión para guardar tus cursos, tu progreso y tus próximas ideas.</p><div className="button-row centered"><Link className="btn btn-primary" to="/login" state={{from:location.pathname}}>Iniciar sesión</Link><Link className="btn btn-secondary" to="/registro" state={{from:location.pathname}}>Crear mi cuenta</Link></div></div>;
  if(role&&user.role!==role)return <div className="page access-page"><span className="value-icon lavender"><GraduationCap size={30}/></span><h1>{role==='CREATOR'?'Lo que sabes puede inspirar a alguien.':'Hay mucho por descubrir.'}</h1><p>{mode==='demo'?`Puedes explorar este espacio cambiando a la cuenta de muestra de ${role==='CREATOR'?'creador':'estudiante'}.`:`Este espacio es para cuentas de ${role==='CREATOR'?'creador':'estudiante'}. Tu cuenta actual tiene un rol diferente.`}</p>{mode==='demo'?<button className="btn btn-primary" onClick={()=>demo(role)}>Probar como {role==='CREATOR'?'creador':'estudiante'}</button>:<Link className="btn btn-primary" to={user.role==='CREATOR'?'/creador':'/aprendizaje'}>Ir a mi espacio</Link>}</div>;
  return children;
}
export default function App(){
  const {pathname}=useLocation();
  useEffect(()=>{const title=pathname==='/catalogo'?'Explorar cursos':pathname==='/aprendizaje'?'Mi aprendizaje':pathname.startsWith('/creador')?'Espacio del creador':pathname==='/favoritos'?'Mis favoritos':'Aprende a tu manera';document.title=`${title} · NeuroTalento`;},[pathname]);
  return <Layout><Routes><Route path="/" element={<Home/>}/><Route path="/catalogo" element={<Catalog/>}/><Route path="/favoritos" element={<Catalog saved/>}/><Route path="/cursos/:id" element={<CourseDetail/>}/><Route path="/login" element={<Login/>}/><Route path="/registro" element={<Register/>}/><Route path="/aprendizaje" element={<Require role="STUDENT"><StudentDashboard/></Require>}/><Route path="/aprender/:id" element={<Require role="STUDENT"><Learn/></Require>}/><Route path="/creador" element={<Require role="CREATOR"><CreatorDashboard/></Require>}/><Route path="/creador/nuevo" element={<Require role="CREATOR"><CourseEditor/></Require>}/><Route path="/creador/cursos/:id" element={<Require role="CREATOR"><CourseEditor/></Require>}/><Route path="/perfil" element={<Require><Profile/></Require>}/><Route path="*" element={<div className="page access-page"><span className="eyebrow">ESTE CAMINO AÚN NO EXISTE</span><h1>Volvamos a encontrar tu rumbo.</h1><p>La página que buscas no está aquí. Hay muchas otras cosas por descubrir.</p><Link className="btn btn-primary" to="/">Volver a mi espacio</Link></div>}/></Routes></Layout>;
}
