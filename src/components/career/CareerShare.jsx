import React, { useEffect, useId, useRef, useState } from 'react';
import { Copy, Share2, X } from 'lucide-react';
import { buildCareerShareText, CAREER_SHARE_URL, careerShareOptions, copyCareerText } from '../../utils/careerShare.js';
import { careerSummary } from '../../utils/careerEngine.js';

export default function CareerShare({ career }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const titleId = useId();
  const summary = careerSummary(career);
  const text = buildCareerShareText(career);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const copy = async (value, message) => {
    try { await copyCareerText(value); setNotice(message); } catch (error) { setNotice(error.message); }
  };
  return <>
    <button className="career-button" onClick={() => { setNotice(''); setOpen(true); }}><Share2 size={17} /> Compartir carrera</button>
    {open && <dialog className="career-share-dialog" ref={dialog} aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
      <div className="career-stack">
        <div className="career-actions justify-between"><h2 id={titleId}>Comparte tu trayectoria</h2><button className="career-button secondary" aria-label="Cerrar compartir" onClick={() => dialog.current.close()}><X size={17} /></button></div>
        <div className="career-share-card"><p className="career-kicker">ADN Banquiller · Mi legado</p><h3>{career.profile.name}</h3><div className="career-metrics"><div><strong>{summary.peakOverall}</strong><span>Media máxima</span></div><div><strong>{career.retirementAge}</strong><span>Edad de retirada</span></div><div><strong>{summary.collectiveAwards.length}</strong><span>Premios colectivos</span></div><div><strong>{summary.individualAwards.length}</strong><span>Premios individuales</span></div></div></div>
        <p className="career-share-copy">{text}</p>
        <div className="career-grid">{careerShareOptions(career).map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="career-button secondary">{item.label}</a>)}</div>
        <div className="career-grid"><button className="career-button secondary" onClick={() => copy(text, 'Resumen copiado.')}><Copy size={16} /> Copiar resumen</button><button className="career-button secondary" onClick={() => copy(buildCareerShareText(career, true), 'Trayectoria completa copiada.')}><Copy size={16} /> Copiar todos los años</button></div>
        <button className="career-button secondary" onClick={() => copy(CAREER_SHARE_URL, 'Enlace al juego copiado.')}>Copiar enlace al juego</button>
        {typeof navigator !== 'undefined' && navigator.share && <button className="career-button secondary" onClick={async () => { try { await navigator.share({ title: 'Mi carrera en ADN Banquiller', text }); } catch (e) { if (e.name !== 'AbortError') setNotice('No se pudo abrir el menú para compartir. Usa una de las opciones anteriores.'); } }}>Más opciones de compartir</button>}
        <p role="status" className="career-muted">{notice}</p>
        <p className="career-muted">El enlace abre el juego, no una partida guardada. El resumen y tus estadísticas se comparten como texto; Facebook puede mostrar solo el enlace.</p>
      </div>
    </dialog>}
  </>;
}
