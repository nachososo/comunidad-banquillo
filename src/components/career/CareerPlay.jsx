import React, { useEffect, useRef } from 'react';
import { ArrowRight, Trophy, BookOpen } from 'lucide-react';
import { CATEGORIES, EFFECT_FIELDS, LAST_AGE, STAGES, START_AGE } from '../../data/careerData.js';
import { advanceCareer, careerSummary, chanceFor, resolveSeason } from '../../utils/careerEngine.js';
import CareerShare from './CareerShare.jsx';
import CareerGroupHeader from './CareerGroupHeader.jsx';
import { messageForProfile } from '../../utils/careerNarrative.js';
import CareerEventScene, { EventSceneHeader } from './CareerEventScene.jsx';
import { isLiveFormat, isSocialFormat, sceneForEvent, senderTone } from '../../utils/careerPresentation.js';
import CareerLiveScene from './CareerLiveScene.jsx';
import CareerChatMessage from './CareerChatMessage.jsx';
import CareerClubLogo from './CareerClubLogo.jsx';
import { transferClubFor } from '../../data/careerClubs.js';
import CareerTrophyCollection, { CareerTrophyIcons } from './CareerTrophyCollection.jsx';
import { interdistrictsResultText } from '../../utils/careerInterdistricts.js';
import { SEASON_ROLE_LABELS } from '../../utils/careerIndividualAwards.js';

const signed = (n) => n > 0 ? '+' + n : String(n);
const format = (n) => n.toFixed(1);

export function CareerProfile({ career }) {
  const summary = careerSummary(career);
  return <header className="career-player-strip">
    <div className="career-club-masthead"><span>ADN Banquiller</span><span>Cuaderno de club</span></div>
    <div className="career-player-main">
      <div className="career-overall-badge" aria-label={'Media actual: ' + career.overall}><span>MEDIA</span><strong>{career.overall}</strong></div>
      <CareerClubLogo variant="crest" className="career-player-logo" club={career.currentClub} />
      <div className="career-player-identity"><p className="career-kicker">#{career.profile.number} · {career.profile.position}</p><h1>{career.profile.name}</h1><p>{career.currentClub.name}</p></div>
      <div className="career-player-age"><span>EDAD</span><strong>{career.age}</strong></div>
    </div>
    <div className="career-player-honours"><span><Trophy size={14} aria-hidden="true" /> Títulos <strong>{summary.collectiveAwards.length}</strong><CareerTrophyIcons awards={summary.collectiveAwards} category="collective" /></span><span>Premios individuales <strong>{summary.individualAwards.length}</strong><CareerTrophyIcons awards={summary.individualAwards} category="individual" /></span><span className="career-player-motto">{career.phase === 'retired' ? 'El dorsal se queda en casa' : 'De quedar para jugar a tener algo que contar'}</span></div>
    {career.phase === 'retired' && (summary.collectiveAwards.length > 0 || summary.individualAwards.length > 0) && <div className="career-profile-trophies">
      {summary.collectiveAwards.length > 0 && <section aria-label="Trofeos colectivos"><CareerTrophyCollection awards={summary.collectiveAwards} category="collective" compact /></section>}
      {summary.individualAwards.length > 0 && <section aria-label="Trofeos individuales"><CareerTrophyCollection awards={summary.individualAwards} category="individual" compact /></section>}
    </div>}
  </header>;
}

export function SeasonHistory({ career, includeHonours = false }) {
  const scrollRef = useRef(null);
  const pending = career.phase === 'event' && !career.seasons.some((year) => year.age === career.age);
  useEffect(() => {
    // Only move the table, not the page or the event decision controls.
    const notebook = scrollRef.current;
    const lastRow = notebook?.querySelector('tbody tr:last-child');
    if (lastRow) {
      const overflow = lastRow.getBoundingClientRect().bottom - notebook.getBoundingClientRect().bottom;
      if (overflow > 0) notebook.scrollTop += overflow + 8;
    }
  }, [career.age, career.seasons.length]);
  return <section className="career-panel career-record-panel" aria-labelledby="career-record-title">
    <div className="career-record-heading"><div><p className="career-kicker">Las temporadas que llevas</p><h2 id="career-record-title">El cuaderno del banquillo</h2></div><BookOpen size={19} aria-hidden="true" /></div>
    <div className="career-notebook-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Cuaderno: temporadas, recuerdos y palmarés">
      <div className="career-table-scroll" tabIndex={0} role="region" aria-label="Estadísticas de cada temporada">
        <table className="career-table"><caption className="sr-only">Edad, categoría, club, media y estadísticas de cada temporada</caption>
          <thead><tr>{['Edad', 'Club', 'Media', 'PJ', 'MIN', 'PTS', 'REB', 'AST', 'ROB', 'TAP', 'V–D'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{career.seasons.map((year, index) => <tr key={year.age} className={index === career.seasons.length - 1 ? 'career-record-latest' : undefined}><th scope="row">{year.age}{year.retired && <small>Retirada</small>}</th><td><HistoryClub club={year.club} subtitle={STAGES[year.category]} collectiveAwards={year.collectiveAwards} individualAwards={year.individualAwards} age={year.age} /></td><td><span className="career-record-rating">{year.overall}</span></td><td>{year.games}</td><td>{year.minutesPerGame}</td>{['points', 'rebounds', 'assists', 'steals', 'blocks'].map((key) => <td key={key}>{format(year.averages[key])}</td>)}<td>{year.wins}–{year.losses}</td></tr>)}
            {pending && <tr className="career-record-pending" aria-label={'Temporada de ' + career.age + ' años pendiente'}>
              <th scope="row"><span className="career-record-age">{career.age}</span></th><td><HistoryClub club={career.currentClub} subtitle="Decisión pendiente" /></td><td><span className="career-record-rating">{career.overall}</span></td>
              {['PJ', 'MIN', 'PTS', 'REB', 'AST', 'ROB', 'TAP', 'V–D'].map((label) => <td key={label} aria-label={label + ': pendiente'} />)}
            </tr>}
          </tbody>
        </table>
      </div>
      {career.seasons.length > 0 && <details className="career-divider"><summary className="cursor-pointer font-bold">Lo que pasó entre partido y partido</summary><div className="career-history mt-5">{career.seasons.map((year) => <article key={year.age}><small>{year.age} años · {year.club.name}</small><h3>{year.event.title}</h3><p className="career-muted">{year.event.accepted ? year.event.success ? 'Aceptado · Éxito' : 'Aceptado · Sin éxito' : 'Rechazado'} · {year.event.text}</p><p className="career-small mt-2">Media: {year.startingOverall} → {year.overall} · {year.injuries} lesiones · {year.gamesMissed} partidos de baja · {year.winningShots} canastas ganadoras</p>{year.role && <p className="career-small mt-2">{SEASON_ROLE_LABELS[year.role]}</p>}{year.interdistrictsQualified && <p className="career-muted mt-2">{interdistrictsResultText(year)}</p>}{[...year.collectiveAwards, ...year.individualAwards].map((award) => <p key={award} className="career-kicker mt-2">{award}</p>)}</article>)}</div></details>}
      {includeHonours && career.seasons.length > 0 && <details className="career-palmares"><summary>Ver palmarés y clubes</summary><CareerHonours career={career} /></details>}
    </div>
  </section>;
}

function HistoryClub({ club, subtitle, collectiveAwards = [], individualAwards = [], age }) {
  const records = (awards) => awards.map((title) => ({ title, age, club: club.name }));
  return <div className="career-record-club"><CareerClubLogo variant="crest" club={club} decorative width={23} height={26} /><div><strong>{club.name}</strong><span className="career-record-meta"><small>{subtitle}</small><CareerTrophyIcons awards={records(collectiveAwards)} category="collective" size="season" /><CareerTrophyIcons awards={records(individualAwards)} category="individual" size="season" /></span></div></div>;
}

export function CareerHonours({ career }) {
  const summary = careerSummary(career);
  return <section className="career-panel career-stack"><div><p className="career-kicker">Palmarés y clubes</p><h2>La vitrina del equipo</h2></div>
    <div className="career-grid">{[['collectiveAwards', 'Premios colectivos', 'collective'], ['individualAwards', 'Premios individuales', 'individual']].map(([key, title, category]) => <section key={key}><h3>{title} · {summary[key].length}</h3><CareerTrophyCollection awards={summary[key]} category={category} /></section>)}</div>
    <div className="career-divider"><h3>Clubes de tu carrera</h3><ul className="career-clubs">{summary.clubs.map((club, index) => <li key={index}><strong>{club.name}</strong><span>{club.fromAge}–{club.toAge} años · {club.seasons} temporadas jugadas</span></li>)}</ul></div>
  </section>;
}

export function CareerFinal({ career, onRestart }) {
  const summary = careerSummary(career);
  return <div className="career-stack career-final-content" tabIndex={0} role="region" aria-label="Resumen de la carrera">
    <section className="career-panel career-final">
      <p className="career-kicker">Dorsal para el recuerdo / {career.retirementReason}</p><h2 className="career-event-title">El banquillo guarda tu sitio.</h2>
      <p className="career-muted">{career.profile.name} · De los {START_AGE} a los {career.retirementAge} años · {summary.seasonsPlayed} temporadas jugadas</p>
      <div className="career-metrics"><div><strong>{summary.peakOverall}</strong><span>Media más alta</span></div><div><strong>{summary.games}</strong><span>Partidos</span></div><div><strong>{summary.collectiveAwards.length}</strong><span>Premios colectivos</span></div><div><strong>{summary.individualAwards.length}</strong><span>Premios individuales</span></div></div>
      <p className="career-muted">{format(summary.averages.points)} PTS · {format(summary.averages.rebounds)} REB · {format(summary.averages.assists)} AST por partido · {summary.winningShots} canastas ganadoras</p>
      <div className="career-actions mt-6"><CareerShare career={career} /><button className="career-button secondary" onClick={onRestart}>Empezar otra carrera</button></div>
    </section>
    <CareerHonours career={career} /><SeasonHistory career={career} />
  </div>;
}


function EventEffects({ effects }) {
  const entries = Object.entries(effects).filter(([, value]) => value !== 0);
  if (!entries.length) return <p className="career-muted">Sin cambios adicionales.</p>;
  return <dl className="career-decision-effects">{entries.map(([key, value]) => <div key={key}><dt>{EFFECT_FIELDS[key]?.label || key}</dt><dd>{signed(value)}{key === 'evolutionPct' ? '%' : key === 'injuryRisk' ? ' pp' : ''}</dd></div>)}</dl>;
}

export function SeasonEvent({ career, action }) {
  const event = career.pendingEvent;
  if (!event) return null;
  const retiring = event.category === 'retirement';
  const offerClub = event.category === 'transfer' ? transferClubFor(event, career) : null;
  const scene = sceneForEvent(event, career);
  const live = isLiveFormat(scene.format);
  const outcomes = <>
    <p className="career-chat-chance"><strong>{chanceFor(event, career)}%</strong> {retiring ? 'de cerrar tu carrera si aceptas' : 'de éxito si aceptas'}</p>
    {offerClub && <p className="career-transfer-terms">Si se cierra el fichaje, juegas esta temporada en <strong>{offerClub.name}</strong>. Si no, sigues en tu equipo.</p>}
    {retiring ? <p>Si confirmas, termina tu carrera y pasamos a los recuerdos del equipo.</p> : <div className="career-outcome-spread">
      <section className="career-decision-outcome"><h3>Si sale bien</h3><EventEffects effects={event.success} />{event.successAward && <p>{event.successAward}</p>}</section>
      <section className="career-decision-outcome failure"><h3>Si sale mal</h3><EventEffects effects={event.failure} />{event.failureAward && <p>{event.failureAward}</p>}</section>
    </div>}
  </>;
  const decisions = <div className={live ? 'career-live-decisions' : 'career-chat-replies'}><p>{live ? 'Tu decisión' : 'Tu respuesta'}</p><div className="career-decision-actions"><button type="button" className="career-button" onClick={() => action((current) => resolveSeason(current, true))}>{messageForProfile(event.acceptLabel, career.profile)}<ArrowRight size={16} aria-hidden="true" /></button><button type="button" className="career-button secondary" onClick={() => action((current) => resolveSeason(current, false))}>{messageForProfile(event.declineLabel, career.profile)}</button></div></div>;
  if (live) return <div className={'career-live-event career-format-' + scene.format} role="region" aria-label={scene.format === 'court' ? 'Decisión en la pista' : scene.format === 'bar' ? 'Conversación en La Caña de Gonzalo' : 'Conversación en el banquillo'}>
    <div className="career-live-content" tabIndex={0} role="region" aria-label="Situación y consecuencias del evento">
    <CareerLiveScene event={event} career={career} scene={scene} />
    <section className="career-live-outcomes" aria-label="Posibles consecuencias">{outcomes}</section>
    </div>
    {decisions}
  </div>;
  return <div className={'career-group-chat career-event-chat career-format-' + scene.format} role="region" aria-label="Presentación ficticia del evento">
    <EventSceneHeader scene={scene} club={career.currentClub} offerClub={offerClub} />
    <div className="career-group-messages" tabIndex={0} role="region" aria-label="Mensaje y condiciones del evento">
      <p className="career-group-day">Temporada · {career.age} años</p>
      <ol className="career-group-thread" aria-label="Propuesta del equipo">
        <CareerEventScene event={event} career={career} />
        <li className="career-event-context"><span className="career-chat-category">{CATEGORIES[event.category]}{scene.location && ' · ' + scene.location}</span><h2 className="career-chat-title">{messageForProfile(event.title, career.profile)}</h2>{(scene.message || isSocialFormat(scene.format)) && <p>{messageForProfile(event.description, career.profile)}</p>}</li>
        <li className="career-group-bubble career-chat-odds">{outcomes}</li>
      </ol>
    </div>
    {decisions}
  </div>;
}

export function SeasonResult({ career, events, action }) {
  const year = career.lastResult;
  if (!year) return null;
  const scene = sceneForEvent(year.event, { ...career, age: year.age });
  const sender = year.transferOffer ? (year.club.contactName || 'Entrenador') : scene.author.name;
  return <div className="career-group-chat career-event-chat" role="region" aria-label="Balance en el chat ficticio del equipo">
    <CareerGroupHeader club={year.club} />
    <div className="career-group-messages" tabIndex={0} role="region" aria-label="Mensajes del balance anual">
    <p className="career-group-day">Temporada completada · {year.age} años</p>
    <ol className="career-group-thread" aria-label="Conversación tras la temporada">
    <li className="career-group-bubble career-chat-outgoing"><strong className="career-group-sender">Tú</strong><p>{year.transferOffer ? year.transfer ? '¡Ya estoy dentro! ¿Cómo ha ido mi primer año aquí?' : 'Sigo con vosotros. ¿Cómo ha ido el año?' : year.event.accepted ? 'Me apunté. ¿Cómo ha ido el año?' : 'Esta vez pasé. ¿Cómo ha ido el año?'}</p></li>
    {year.transfer && <li className="career-group-system">Te has incorporado a {year.club.groupName || year.club.name}.</li>}
    <CareerChatMessage sender={sender} tone={senderTone(sender)} time="18:11">
    <h2 className="career-chat-title">{year.event.accepted ? year.event.success ? 'Esta va al grupo.' : 'Toca volver al entreno.' : 'Seguimos a lo nuestro.'}</h2>
    <p>{messageForProfile(year.event.text, career.profile)}</p>
    <p className="career-season-verdict">{signed(year.overall - year.startingOverall)} de media esta temporada</p>
    <div className="career-result-box"><p><strong>{year.wins} victorias · {year.losses} derrotas</strong></p><p>{year.games} partidos jugados · {year.gamesMissed} de baja</p><p>El cuaderno ya tiene otra página.</p></div>
    {year.role && <p className="career-small mt-3">Tu papel este año: {SEASON_ROLE_LABELS[year.role]}</p>}
    {year.interdistrictsQualified && <p className="career-result-box">{interdistrictsResultText(year)}</p>}
    {year.injuries > 0 && <p className="career-result-failure mt-3">{year.injuries} lesión añadida al historial.</p>}
    {year.winningShots > 0 && <p className="career-result-success mt-3">{year.winningShots} canasta ganadora. Esta se contará en el siguiente entreno.</p>}
    {[...year.collectiveAwards, ...year.individualAwards].map((award) => <p key={award} className="career-kicker mt-3">🏆 {award}</p>)}
    </CareerChatMessage></ol></div>
    <div className="career-chat-replies"><button className="career-button" onClick={() => action((current) => advanceCareer(current, events))}>{career.age === LAST_AGE ? 'Ver el resumen de mi carrera' : 'Pasar a los ' + (career.age + 1) + ' años'}<ArrowRight size={17} aria-hidden="true" /></button></div>
  </div>;
}

export default function CareerPlay({ career, events, action, onRestart }) {
  return <div className={'career-game' + (career.phase !== 'retired' ? ' career-playing' : ' career-finished')}>
    <CareerProfile career={career} />
    {career.phase === 'retired' ? <CareerFinal career={career} onRestart={onRestart} /> : <>
      <div className="career-game-columns">
        <section className="career-panel career-season-panel" aria-label="Tu temporada">{career.phase === 'event' ? <SeasonEvent career={career} action={action} /> : <SeasonResult career={career} events={events} action={action} />}</section>
        <SeasonHistory career={career} includeHonours />
      </div>
    </>}
  </div>;
}
