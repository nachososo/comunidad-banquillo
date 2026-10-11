import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import CareerLayout, { Field, Notice } from '../components/career/CareerLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { CATEGORIES, DEFAULT_CAREER_CONFIG, EFFECT_FIELDS, newCareerEvent, newTransferEvent, POSITIONS, STAGES, START_AGE, LAST_AGE, MAX_SEASONS } from '../data/careerData.js';
import { clubsFor, STARTING_CLUB } from '../data/careerClubs.js';
import CareerClubsEditor from '../components/career/CareerClubsEditor.jsx';
import { CareerTrophyPreview } from '../components/career/CareerTrophyCollection.jsx';
import { careerRepository } from '../lib/careerRepository.js';
import { chanceFor, effectsText, validateConfig } from '../utils/careerEngine.js';
import { POTENTIAL_BANDS } from '../utils/careerDevelopment.js';
import { ATTRIBUTES } from '../utils/careerAttributes.js';
import { interdistrictsRange, interdistrictsChanceFor } from '../utils/careerInterdistricts.js';
import CareerPresentationEditor from '../components/career/CareerPresentationEditor.jsx';
import { PRESENTATION_FORMATS, presentationFor } from '../utils/careerPresentation.js';
import { catalogForExport, MAX_CATALOG_BYTES, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../lib/careerLocalCatalog.js';

const NumberField = ({ label, value, min, max, step = 1, onChange, hint }) => <Field label={label} hint={hint}><input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></Field>;

export function InterdistrictsSettingsEditor({ settings, change }) {
  const { base, max } = interdistrictsRange(settings);
  return <fieldset className="career-stack career-divider">
    <legend className="font-bold">Copa Interdistritos</legend>
    <p className="career-muted">Ganar la liga municipal clasifica al equipo para la Copa al cierre de ese mismo año. No consume otro evento ni modifica los partidos o estadísticas de liga. El porcentaje es la posibilidad de ganar la Copa una vez clasificado, no de ganar ambas competiciones.</p>
    <div className="career-grid">
      <NumberField label="Victoria en Copa con media 0 (%)" min={0.01} max={25} step={0.01} value={base} onChange={(interdistrictsBaseChance) => change({ interdistrictsBaseChance })} />
      <NumberField label="Victoria en Copa con media 100 (%)" min={0.01} max={25} step={0.01} value={max} onChange={(interdistrictsMaxChance) => change({ interdistrictsMaxChance })} />
    </div>
    <p className="career-muted">La probabilidad crece de forma lineal con la media final. Máximo permitido: 25%. {typeof base === 'number' && typeof max === 'number' && max > base && [40, 70, 90].map((overall) => 'Media ' + overall + ': ' + interdistrictsChanceFor(overall, settings).toLocaleString('es-ES') + '%').join(' · ')}</p>
  </fieldset>;
}

function EffectsEditor({ event, outcome, change }) {
  const success = outcome === 'success';
  return <fieldset className="career-admin-choice career-stack">
    <legend className="career-kicker px-2">{success ? 'Si sale bien' : 'Si sale mal'}</legend>
    <Field label={success ? 'Narración de éxito' : 'Narración de fallo'}><textarea maxLength={500} value={event[outcome + 'Text']} onChange={(e) => change({ [outcome + 'Text']: e.target.value })} /></Field>
    {event.category === 'retirement' && success ? <p className="career-muted">Aceptar con éxito termina la carrera antes de disputar esta temporada. No añade estadísticas ni premios.</p> : <>
      <p className="career-muted">Habilidades: cambios permanentes en la escala 0–100. Evolución: porcentaje de mejora adicional este año. Riesgo: puntos porcentuales sobre la probabilidad anual, solo este año.</p>
      <div className="career-effects">{Object.entries(EFFECT_FIELDS).filter(([key]) => key in ATTRIBUTES || ['evolutionPct', 'injuryRisk'].includes(key)).map(([key, field]) => <NumberField key={key} label={field.label} min={field.min} max={field.max} value={event[outcome][key] ?? 0} hint={field.help} onChange={(value) => change({ [outcome]: { ...event[outcome], [key]: value } })} />)}</div>
      <details><summary className="career-muted cursor-pointer">Momentos de partido y efectos avanzados / antiguos</summary><div className="career-effects mt-4">{Object.entries(EFFECT_FIELDS).filter(([key]) => !(key in ATTRIBUTES) && !['evolutionPct', 'injuryRisk'].includes(key)).map(([key, field]) => <NumberField key={key} label={field.label} min={field.min} max={field.max} value={event[outcome][key] ?? 0} hint={field.help} onChange={(value) => change({ [outcome]: { ...event[outcome], [key]: value } })} />)}</div></details>
      <Field label="Premio individual opcional" hint="Se añade al palmarés de ese año si se juega al menos un partido."><input maxLength={100} value={event[outcome + 'Award']} onChange={(e) => change({ [outcome + 'Award']: e.target.value })} placeholder="Ej.: Premio al liderazgo" /></Field>
      <p className="career-muted">{effectsText(event[outcome])}</p>
    </>}
  </fieldset>;
}

export function EventEditor({ event, change, clubs = [STARTING_CLUB] }) {
  return <div className="career-stack">
    <Field label="Título"><input maxLength={100} value={event.title} onChange={(e) => change({ title: e.target.value })} placeholder="Ej.: Torneo en La Elipa" /></Field>
    <Field label="Solo mientras juegas en" hint="Los eventos exclusivos del Banquillo dejan de aparecer al fichar por otro club y pueden volver si regresas, respetando sus demás condiciones."><select value={event.clubId || 'all'} onChange={(e) => change({ clubId: e.target.value })}><option value="all">Cualquier club</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}{club.id === 'cdb' ? ' · Exclusivo del Banquillo' : ''}</option>)}</select></Field>
    {event.category === 'transfer' && <Field label="Club que hace la oferta" hint="Crea y personaliza sus datos en la pestaña Clubes."><select value={event.targetClubId || ''} onChange={(e) => change({ targetClubId: e.target.value })}><option value="">Selecciona el destino</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></Field>}
    <CareerPresentationEditor event={event} change={change} clubs={clubs} />
    <Field label="Situación de la temporada" hint="Explicación del juego que aparece debajo del mensaje, sin atribuírsela a quien habla."><textarea maxLength={1000} value={event.description} onChange={(e) => change({ description: e.target.value })} /></Field>
    <div className="career-grid">
      <Field label="Tipo de evento"><select value={event.category} onChange={(e) => change(e.target.value === 'retirement'
        ? { category: 'retirement', minAge: Math.max(30, event.minAge), maxAge: Math.max(30, event.maxAge), stage: 'senior', chance: 100, influence: 0, success: {}, successAward: '', acceptLabel: 'Retirarme', declineLabel: 'Seguir compitiendo' }
        : e.target.value === 'transfer' ? { category: 'transfer', targetClubId: event.targetClubId || '', minAge: Math.max(18, event.minAge), maxAge: Math.max(18, event.maxAge), stage: 'all', chance: 100, influence: 0, presentation: { ...presentationFor(event), format: 'direct', authorMode: 'external', authorName: 'Coordinación deportiva' }, acceptLabel: 'Aceptar la oferta', declineLabel: 'Quedarme en mi equipo' }
        : { category: e.target.value })}>{Object.entries(CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="Evento activo"><input type="checkbox" checked={event.enabled} onChange={(e) => change({ enabled: e.target.checked })} /><small>Desactívalo para pausarlo sin borrarlo.</small></Field>
      <NumberField label={event.category === 'transfer' ? 'Probabilidad de cerrar el fichaje (%)' : 'Éxito al aceptarlo (%)'} min={0} max={100} value={event.chance} onChange={(chance) => change({ chance })} hint="0 = nunca; 100 = siempre. Rechazar nunca sortea el resultado." />
      <NumberField label="Peso de aparición" min={1} max={100} value={event.weight} onChange={(weight) => change({ weight })} hint="Peso base relativo, no porcentaje de éxito. En retiradas por lesiones aumenta un 25% por lesión sobre el mínimo requerido, hasta multiplicarse por 3." />
    </div>
    <details><summary className="career-muted cursor-pointer">Ajustar éxito según una habilidad</summary><div className="career-grid mt-4"><Field label="Habilidad que influye"><select value={event.influenceAttribute || 'overall'} onChange={(e) => change({ influenceAttribute: e.target.value })}><option value="overall">Media global</option>{Object.entries(ATTRIBUTES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><NumberField label="Ajuste máximo (puntos porcentuales)" min={0} max={30} value={event.influence} onChange={(influence) => change({ influence })} hint="0 mantiene la probabilidad fija. Habilidad 50 no cambia nada; 100 suma el máximo y 0 lo resta. Bases 0% y 100% se respetan." /></div></details>
    <fieldset className="career-stack career-divider"><legend className="font-bold">Cuándo puede aparecer</legend>
      <div className="career-grid">
        <NumberField label="Desde los años" min={event.category === 'retirement' ? 30 : event.category === 'transfer' ? 18 : START_AGE} max={LAST_AGE} value={event.minAge} onChange={(minAge) => change({ minAge })} />
        <NumberField label="Hasta los años" min={START_AGE} max={LAST_AGE} value={event.maxAge} onChange={(maxAge) => change({ maxAge })} />
        <Field label="Categoría deportiva"><select value={event.stage} onChange={(e) => change({ stage: e.target.value })}><option value="all">Todas</option>{Object.entries(STAGES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <p className="career-muted">Equipo mixto: todos los eventos están disponibles por igual. El género solo adapta el trato en los mensajes; no filtra eventos ni cambia los rivales.</p>
        <Field label="Posición"><select value={event.position} onChange={(e) => change({ position: e.target.value })}><option value="all">Cualquiera</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</select></Field>
        <NumberField label="Lesiones previas mínimas" min={0} max={100} value={event.minInjuries} onChange={(minInjuries) => change({ minInjuries })} />
        <NumberField label="Años de descanso antes de repetirse" min={0} max={MAX_SEASONS - 1} value={event.cooldown} onChange={(cooldown) => change({ cooldown })} />
        <NumberField label="Máximo de apariciones en la carrera" min={1} max={MAX_SEASONS} value={event.maxOccurrences} onChange={(maxOccurrences) => change({ maxOccurrences })} />
      </div>
      <p className="career-muted">La carrera empieza a los {START_AGE} en el equipo municipal de tu primo. Junior 17–18 · Senior 19–40 son grupos de edad, no cambios de competición. Los filtros infantiles y cadetes se conservan para catálogos antiguos, pero ya no aparecen en las partidas. No hay retirada antes de los 30.</p>
    </fieldset>
    <div className="career-grid">
      <Field label="Botón para aceptar"><input maxLength={140} value={event.acceptLabel} onChange={(e) => change({ acceptLabel: e.target.value })} /></Field>
      <Field label="Botón para rechazar"><input maxLength={140} value={event.declineLabel} onChange={(e) => change({ declineLabel: e.target.value })} /></Field>
    </div>
    <Field label="Narración al rechazar" hint="Rechazar no aplica efectos: la temporada sigue con su evolución normal."><textarea maxLength={500} value={event.declineText} onChange={(e) => change({ declineText: e.target.value })} /></Field>
    <EffectsEditor event={event} outcome="success" change={change} />
    <EffectsEditor event={event} outcome="failure" change={change} />
  </div>;
}

function EventPreview({ event }) {
  const [overall, setOverall] = useState(50);
  const [result, setResult] = useState(null);
  useEffect(() => { setResult(null); }, [event, overall]);
  return <details className="career-panel"><summary className="cursor-pointer font-bold">Probar el evento sin jugar una carrera</summary><div className="career-stack mt-5">
    <Field label={(ATTRIBUTES[event.influenceAttribute] || 'Media') + ' de prueba: ' + overall}><input type="range" min={0} max={100} value={overall} onChange={(e) => setOverall(Number(e.target.value))} /></Field>
    <p className="career-muted">Probabilidad final: {chanceFor(event, overall)}%</p>
    <div className="career-actions"><button className="career-button" onClick={() => { const success = Math.random() * 100 < chanceFor(event, overall); setResult((success ? 'Éxito: ' : 'Fallo: ') + (success ? event.successText : event.failureText)); }}>Aceptar y sortear</button><button className="career-button secondary" onClick={() => setResult(event.declineText)}>Rechazar</button></div>
    <div className="career-actions"><button className="career-button secondary" onClick={() => setResult('Éxito: ' + event.successText + ' · ' + (event.category === 'retirement' ? 'Fin de la carrera.' : effectsText(event.success)))}>Ver éxito y efectos</button><button className="career-button secondary" onClick={() => setResult('Fallo: ' + event.failureText + ' · ' + effectsText(event.failure))}>Ver fallo y efectos</button></div>
    <Notice>{result}</Notice><p className="career-muted">La prueba solo simula la decisión, no los filtros de aparición ni las estadísticas anuales.</p>
  </div></details>;
}

function CareerAdminEditor({ local = false }) {
  const [config, setConfig] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tab, setTab] = useState('events');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const updatedAt = useRef(null), lock = useRef(false), pendingSave = useRef(null), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true; setLoadError('');
    (local ? Promise.resolve().then(() => ({ data: readLocalCareerCatalog(), remote: false, migrated: false, updatedAt: null })) : careerRepository.loadConfig()).then((loaded) => {
      if (!active) return;
      setConfig(loaded.data); setSelectedId(loaded.data.events[0]?.id || ''); updatedAt.current = loaded.updatedAt;
      setDirty(loaded.migrated);
      setNotice(local ? 'Taller local: solo se guarda el catálogo en este navegador. No publica nada ni guarda partidas.' : loaded.migrated ? 'Catálogo anterior adaptado: se usa la primera decisión como reto aceptable. Revisa efectos y edades antes de publicar.' : loaded.remote ? 'Catálogo publicado cargado.' : 'Catálogo inicial preparado para revisar y publicar.');
    }).catch((e) => { if (active) setLoadError(e.message); });
    return () => { active = false; };
  }, [reload, local]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const edit = (fn) => {
    if (lock.current) return;
    setConfig(fn); setDirty(true); setNotice(local ? 'Borrador local sin guardar.' : 'Borrador sin publicar.'); setError(''); pendingSave.current = null;
  };
  const change = (changes) => edit((current) => ({ ...current, events: current.events.map((event) => event.id === selectedId ? { ...event, ...changes } : event) }));
  const save = async () => {
    if (lock.current) return;
    const errors = validateConfig(config);
    if (errors.length) { setError(errors.slice(0, 6).join(' ')); return; }
    lock.current = true; setBusy(true); setError('');
    if (local) {
      try { setConfig(saveLocalCareerCatalog(config)); setDirty(false); setNotice('Catálogo guardado solo en este navegador. Abre una partida nueva para usarlo; las abiertas no cambian.'); }
      catch (e) { setError(e.message); }
      finally { lock.current = false; setBusy(false); }
      return;
    }
    const candidate = pendingSave.current || { ...config, saveToken: crypto.randomUUID() };
    pendingSave.current = candidate;
    try {
      const saved = await careerRepository.saveConfig(candidate, updatedAt.current);
      if (mounted.current) { updatedAt.current = saved.updatedAt; setConfig(saved.data); setDirty(false); setNotice('Publicado. Se aplicará al iniciar nuevas partidas.'); pendingSave.current = null; }
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  if (loadError) return <CareerLayout admin><Notice error>{loadError}</Notice><button className="career-button" onClick={() => setReload((value) => value + 1)}>Reintentar</button>{local && <button className="career-button secondary" onClick={() => { setConfig(structuredClone(DEFAULT_CAREER_CONFIG)); setSelectedId(DEFAULT_CAREER_CONFIG.events[0]?.id || ''); setLoadError(''); setDirty(true); }}>Abrir catálogo base sin sobrescribir lo guardado</button>}</CareerLayout>;
  if (!config) return <CareerLayout admin><Notice>Cargando catálogo…</Notice></CareerLayout>;
  const selected = config.events.find((event) => event.id === selectedId);
  const visible = config.events.filter((event) => {
    const p = presentationFor(event);
    const text = [event.title, event.description, p.message, p.authorName, p.post.author, p.post.handle, p.post.title, p.post.text].join(' ').toLocaleLowerCase('es');
    return text.includes(query.toLocaleLowerCase('es')) && (filter === 'all' || (filter === 'active' ? event.enabled : !event.enabled)) && (formatFilter === 'all' || p.format === formatFilter) && (categoryFilter === 'all' || event.category === categoryFilter);
  });
  const add = (transfer = false) => {
    const event = transfer === true ? newTransferEvent(crypto.randomUUID(), clubsFor(config).find((club) => club.id !== 'cdb')?.id || '') : newCareerEvent(crypto.randomUUID());
    edit((current) => ({ ...current, events: [...current.events, event] }));
    setSelectedId(event.id); setQuery(''); setFilter('all'); setFormatFilter('all'); setCategoryFilter('all'); setTab('events');
  };
  const exportCatalog = () => {
    try {
      const data = catalogForExport(config);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'adn-banquiller-eventos.json'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Catálogo exportado. El archivo no contiene partidas ni resultados.');
    } catch (e) { setError(e.message); }
  };
  const importCatalog = async (input) => {
    const file = input.files?.[0]; input.value = '';
    if (!file || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      if (file.size > MAX_CATALOG_BYTES) throw new Error('El archivo supera el límite de 3 MB.');
      const imported = parseCareerCatalog(await file.text());
      if (!mounted.current || !window.confirm('¿Reemplazar el borrador por los ' + imported.events.length + ' eventos del archivo? Lo guardado no cambia hasta que confirmes el guardado.')) return;
      setConfig(imported); setSelectedId(imported.events[0]?.id || ''); setQuery(''); setFilter('all'); setFormatFilter('all'); setCategoryFilter('all'); setTab('events'); setDirty(true); pendingSave.current = null; setError(''); setNotice('Archivo importado como borrador. Revisa la vista previa antes de guardar.');
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return <CareerLayout admin warnOnLeave={dirty || busy}>
    <div className="career-heading"><div><p className="career-kicker">ADN Banquiller / Eventos anuales</p><h1>Cada año, una historia.</h1><p className="career-muted mt-3">Un evento por temporada. Aceptar o rechazar. Éxito o fallo, con consecuencias distintas.</p></div><div className="career-actions"><button className="career-button" disabled={busy || config.events.length >= 500} onClick={() => add()}><Plus size={17} /> Nuevo evento</button><button className="career-button secondary" disabled={busy || config.events.length >= 500} onClick={() => add(true)}>Nuevo fichaje</button></div></div>
    <Notice error={Boolean(error)}>{error || notice}</Notice>
    <div className="career-catalog-tools"><button className="career-button secondary" disabled={busy} onClick={exportCatalog}>Exportar catálogo JSON</button><Field label="Importar catálogo JSON"><input type="file" accept=".json,application/json" disabled={busy} onChange={(e) => importCatalog(e.currentTarget)} /></Field></div>
    <div className="career-admin-summary"><span>{config.events.length} eventos</span><span>{config.events.filter((event) => event.enabled).length} activos</span><span>{START_AGE}–{LAST_AGE} años · {MAX_SEASONS} temporadas posibles</span><span>{dirty ? 'Borrador pendiente' : 'Sin cambios pendientes'}</span></div>
    <div className="career-tabs">{[['events', 'Eventos'], ['clubs', 'Clubes'], ['rules', 'Simulación anual'], ['trophies', 'Trofeos']].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    <fieldset disabled={busy} className="min-w-0">
      {tab === 'trophies' ? <CareerTrophyPreview /> : tab === 'clubs' ? <CareerClubsEditor config={config} edit={edit} /> : tab === 'rules' ? <section className="career-panel career-stack">
        <h2>Reglas de la carrera</h2><p className="career-muted">Se empieza a los {START_AGE}, con la invitación de tu primo al equipo municipal de la Comunidad del Banquillo, y se termina como máximo a los {LAST_AGE}. La invitación no consume un evento anual. La retirada anticipada solo puede aparecer desde los 30.</p>
        <div><h3>Desarrollo individual oculto</h3><p className="career-muted mt-3">Media inicial 40. El potencial se sortea una sola vez; no garantiza alcanzarlo ni limita los efectos de los eventos. Reparto actual: {POTENTIAL_BANDS.map((band) => band.min + '–' + band.max + ': ' + band.weight + '%').join(' · ')}.</p><p className="career-muted mt-3">Ritmo entre 0,8× y 1,2×. Maduración precoz 20%, normal 60% o tardía 20%. La edad, el margen de mejora y las lesiones determinan la evolución natural, con decimales acumulados. Estos parámetros pertenecen al motor local, no a la configuración publicable de eventos.</p></div>
        <div className="career-grid"><NumberField label="Partidos simulados por temporada" value={config.settings.gamesPerSeason} min={10} max={40} onChange={(gamesPerSeason) => edit((current) => ({ ...current, settings: { ...current.settings, gamesPerSeason } }))} /><NumberField label="Dificultad de la competición" value={config.settings.difficulty} min={20} max={80} onChange={(difficulty) => edit((current) => ({ ...current, settings: { ...current.settings, difficulty } }))} /></div>
        <InterdistrictsSettingsEditor settings={config.settings} change={(changes) => edit((current) => ({ ...current, settings: { ...current.settings, ...changes } }))} />
        <div className="career-stack career-divider"><h3>Nuevos premios individuales</h3><p className="career-muted">Requieren disputar al menos la mitad de la liga. Máximo reboteador: 8 rebotes por partido y un 40% de opción. Mejor defensor: defensa 75 o más, 2 robos + tapones por partido y un 35% de opción. Sexto hombre: papel de banquillo, media 60 o más, 10 puntos por partido y un 30% de opción.</p><p className="career-muted">Sin plantillas completas, el rol se estima por minutos: de 20 a 27 corresponde a la rotación de banquillo; desde 28, titular. Los premios se sortean entre temporadas que cumplen los requisitos, no comparan una clasificación de rivales simulados.</p></div>
        <p className="career-muted">Las partidas no se guardan. Estos ajustes y el catálogo se fijan al empezar una partida nueva. La simulación anual calcula estadísticas y premios; los eventos añaden sus efectos.</p>
      </section> : <div className="career-workspace">
        <aside className="career-panel"><Field label="Buscar eventos"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título, mensaje o explicación" /></Field><div className="career-stack mt-3"><Field label="Estado"><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Pausados</option></select></Field><Field label="Formato"><select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}><option value="all">Todos los formatos</option>{Object.entries(PRESENTATION_FORMATS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Categoría"><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">Todas las categorías</option>{Object.entries(CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field></div>
          <div className="career-admin-list">{visible.map((event) => <button className={'career-choice ' + (selectedId === event.id ? 'selected' : '')} aria-pressed={selectedId === event.id} key={event.id} onClick={() => setSelectedId(event.id)}><strong>{event.title || 'Nuevo evento'}</strong><small>{event.enabled ? 'Activo' : 'Pausado'} · {event.minAge}–{event.maxAge} años · {event.chance}%</small></button>)}{!visible.length && <p className="career-muted">No hay eventos que coincidan.</p>}</div>
        </aside>
        {selected ? <div className="career-stack"><section className="career-panel career-stack">
          <div className="career-actions justify-between"><h2 className="!m-0">Editar evento</h2><div className="career-actions">
            <button className="career-button secondary" disabled={config.events.length >= 500} onClick={() => { const copy = { ...structuredClone(selected), id: crypto.randomUUID(), title: selected.title.slice(0, 91) + ' (copia)', enabled: false }; edit((current) => ({ ...current, events: [...current.events, copy] })); setSelectedId(copy.id); }}><Copy size={15} /> Duplicar</button>
            <button className="career-button danger" onClick={() => { if (!window.confirm('¿Eliminar este evento del catálogo? Se aplicará al publicar.')) return; edit((current) => ({ ...current, events: current.events.filter((event) => event.id !== selected.id) })); setSelectedId(config.events.find((event) => event.id !== selected.id)?.id || ''); }}><Trash2 size={15} /> Eliminar</button>
          </div></div><EventEditor key={selected.id} event={selected} change={change} clubs={clubsFor(config)} />
        </section><EventPreview event={selected} /></div> : <section className="career-panel"><h2>No hay eventos</h2><p className="career-muted">Si no hay eventos elegibles, aparecerá el reto básico «Una temporada para crecer». Nunca reaparecerá un evento eliminado del catálogo.</p><button className="career-button mt-5" onClick={add}>Crear evento</button></section>}
      </div>}
    </fieldset>
    <div className="career-toolbar"><p className="career-muted">{dirty ? local ? 'Cambios locales sin guardar.' : 'Cambios aún no publicados.' : 'Catálogo listo.'}</p><button className="career-button" disabled={busy || (!dirty && Boolean(updatedAt.current))} onClick={save}><Save size={17} />{busy ? 'Guardando…' : local ? 'Guardar catálogo local' : 'Publicar configuración'}</button></div>
  </CareerLayout>;
}

export default function CareerAdminPage() {
  const { user, loading, isAuthenticated, isAdmin, authMode } = useAuth();
  if (import.meta.env.DEV) return <CareerAdminEditor local />;
  if (loading) return <CareerLayout admin><Notice>Cargando permisos…</Notice></CareerLayout>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: '/panel-control/adn-banquiller' }} replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;
  if (authMode !== 'supabase') return <CareerLayout admin><Notice error>El panel requiere una cuenta administradora conectada para publicar eventos.</Notice></CareerLayout>;
  return <CareerAdminEditor key={user.id} />;
}
