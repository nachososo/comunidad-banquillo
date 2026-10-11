import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings2 } from 'lucide-react';
import Header from '../Header.jsx';
import Footer from '../Footer.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import './career.css';
import { START_AGE, LAST_AGE } from '../../data/careerData.js';

export default function CareerLayout({ children, admin = false, warnOnLeave = false, leaveMessage = 'Hay cambios sin guardar. ¿Quieres salir y descartarlos?' }) {
  const { isAdmin } = useAuth();
  return <div className={'min-h-screen flex flex-col bg-[#0a0a0a]' + (!admin ? ' career-viewport' : '')} onClickCapture={(event) => {
    const link = event.target.closest?.('a[href]');
    if (warnOnLeave && link && !event.metaKey && !event.ctrlKey && !event.shiftKey && link.target !== '_blank' && !window.confirm(leaveMessage)) {
      event.preventDefault(); event.stopPropagation();
    }
  }}>
    <Helmet><title>{admin ? 'Control de eventos' : 'ADN Banquiller · Modo carrera'} - La Comunidad del Banquillo</title><meta name="description" content={`De los ${START_AGE} a los ${LAST_AGE} años: tu primo te invita al equipo municipal. Vive cada temporada y comparte tu legado. Sin registro.`} /></Helmet>
    <Header />
    <main className="career-shell flex-1">
      <div className="career-topline"><Link to={admin ? '/panel-control' : '/'}><ArrowLeft size={14} /> {admin ? 'Panel de control' : 'La Comunidad'}</Link><span>CDB ORIGINAL · MODO CARRERA</span>{(isAdmin || import.meta.env.DEV) && <Link target="_blank" rel="noopener noreferrer" to={admin ? '/adn-banquiller' : '/panel-control/adn-banquiller'}><Settings2 size={14} />{admin ? 'Ver juego' : import.meta.env.DEV ? 'Taller local de eventos' : 'Control de eventos'}</Link>}</div>
      {admin ? children : <div className="career-stage">{children}</div>}
    </main>{admin && <Footer />}
  </div>;
}

export const Field = ({ label, children, hint }) => <label className="career-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
export const Notice = ({ children, error = false }) => children ? <div className={`career-notice ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div> : null;
