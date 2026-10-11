import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import CareerLayout, { Field, Notice } from '../components/career/CareerLayout.jsx';
import CareerPlay from '../components/career/CareerPlay.jsx';
import CareerInvitation from '../components/career/CareerInvitation.jsx';
import CareerGroupWelcome from '../components/career/CareerGroupWelcome.jsx';
import { ARCHETYPES, DEFAULT_CAREER_CONFIG, POSITIONS, START_AGE } from '../data/careerData.js';
import { careerRepository } from '../lib/careerRepository.js';
import { createCareer } from '../utils/careerEngine.js';
import { readLocalCareerCatalog } from '../lib/careerLocalCatalog.js';

export function CareerCreation({ onCreate, busy = false }) {
  const [profile, setProfile] = useState({ name: '', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' });
  const set = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  return <div className="career-intro">
    <section className="career-pitch">
      <p className="career-kicker">Invitación aceptada · {START_AGE} años</p>
      <h1>Una camiseta.<br />Un grupo.<br /><em>Tu sitio.</em></h1>
      <p>Tu primo ya cuenta contigo. Empiezas en la Comunidad del Banquillo, el equipo municipal que ha montado con sus amigos.</p>
      <img src="/img/logo.png" alt="La Comunidad del Banquillo" />
    </section>
    <form className="career-panel career-stack" onSubmit={(e) => { e.preventDefault(); onCreate(profile); }}>
      <div><p className="career-kicker">Tu identidad</p><h2>Haz sitio en el banquillo</h2></div>
      <div className="career-grid">
        <Field label="Nombre deportivo"><input required maxLength={30} value={profile.name} onChange={(e) => set('name', e.target.value)} placeholder="Tu nombre o apodo" /></Field>
        <Field label="Dorsal"><input required type="number" min={0} max={99} value={profile.number} onChange={(e) => set('number', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
        <Field label="Equipo"><select value={profile.gender} onChange={(e) => set('gender', e.target.value)}><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select></Field>
        <Field label="Posición"><select value={profile.position} onChange={(e) => set('position', e.target.value)}>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</select></Field>
      </div>
      <fieldset><legend className="career-muted mb-3">Tu estilo de juego</legend><div className="career-grid">
        {Object.entries(ARCHETYPES).map(([id, item]) => <button key={id} type="button" aria-pressed={profile.archetype === id} className={'career-choice ' + (profile.archetype === id ? 'selected' : '')} onClick={() => set('archetype', id)}><strong>{item.label}</strong><p>{item.description}</p></button>)}
      </div></fieldset>
      <button className="career-button" disabled={busy}>Empezar mi carrera <ArrowRight size={17} /></button>
    </form>
  </div>;
}

export function CareerSession({ career, events, action, onRestart }) {
  return career.welcomePending
    ? <CareerGroupWelcome profile={career.profile} club={career.currentClub} onContinue={() => action((current) => ({ ...current, welcomePending: false }))} />
    : <CareerPlay career={career} events={events} action={action} onRestart={onRestart} />;
}

export default function CareerPage() {
  const [config, setConfig] = useState(null);
  const [career, setCareer] = useState(null);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const current = useRef(null);
  useEffect(() => {
    let active = true;
    setLoadError('');
    (import.meta.env.DEV ? Promise.resolve().then(() => ({ data: readLocalCareerCatalog() })) : careerRepository.loadConfig())
      .then((loaded) => { if (active) setConfig(loaded.data); })
      .catch((e) => { if (active) setLoadError(e.message); });
    return () => { active = false; };
  }, [reload]);
  const hasCareer = Boolean(career);
  useEffect(() => {
    if (!hasCareer) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasCareer]);

  // Compare the rendered state to the latest state: rapid double-clicks cannot
  // resolve two seasons, and randomness never runs inside a React state updater.
  const action = (transform) => {
    if (current.current !== career) return;
    try {
      const next = transform(current.current);
      current.current = next; setCareer(next); setError('');
    } catch (e) { setError(e.message); }
  };
  const restart = () => {
    if (!window.confirm('¿Empezar otra carrera? Este resumen no se guardará. Compártelo antes si quieres conservarlo.')) return;
    current.current = null; setCareer(null); setInvitationAccepted(false); setError('');
  };
  return <CareerLayout warnOnLeave={hasCareer} leaveMessage="Esta carrera no se guarda. ¿Quieres salir y perderla?">
    <Notice error>{error || loadError}</Notice>
    {!config && loadError && <div className="career-actions mb-5">
      <button className="career-button" onClick={() => setReload((value) => value + 1)}>Reintentar</button>
      <button className="career-button secondary" onClick={() => { setConfig(structuredClone(DEFAULT_CAREER_CONFIG)); setLoadError(''); }}>Jugar con el catálogo inicial</button>
    </div>}
    {career
      ? <CareerSession career={career} events={config.events} action={action} onRestart={restart} />
      : !invitationAccepted ? <CareerInvitation onAccept={() => setInvitationAccepted(true)} />
        : <><Notice>{!config && !loadError ? 'Cargando eventos del club…' : ''}</Notice><CareerCreation busy={!config} onCreate={(profile) => action(() => ({ ...createCareer(profile, config), welcomePending: true }))} /></>}
  </CareerLayout>;
}
