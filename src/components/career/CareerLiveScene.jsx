import React from 'react';
import { messageForProfile } from '../../utils/careerNarrative.js';
import { BAR_LOCATION_IMAGE } from '../../utils/careerPresentation.js';

export default function CareerLiveScene({ event, career, scene }) {
  const court = scene.format === 'court';
  const bar = scene.format === 'bar';
  const text = messageForProfile(scene.message || event.description, career.profile);
  return <>
    <header className="career-live-heading"><span>{court ? 'En la pista' : bar ? 'La Caña de Gonzalo' : 'A pie de pista'}</span><span>Temporada · {career.age} años</span></header>
    {bar && <figure className="career-location-hero"><img src={BAR_LOCATION_IMAGE} alt="Exterior del bar La Caña de Gonzalo" /><figcaption>Después del partido · La Caña de Gonzalo</figcaption></figure>}
    {court ? <div className="career-scoreboard" role="group" aria-label="Marcador narrativo de la escena">
      <div className="career-scoreboard-clock"><span>{scene.court.period}</span><strong>{scene.court.clock}</strong></div>
      <div className="career-scoreboard-teams"><div><span>{scene.court.homeLabel}</span><strong>{scene.court.homeScore}</strong></div><span aria-hidden="true">—</span><div><span>{scene.court.awayLabel}</span><strong>{scene.court.awayScore}</strong></div></div>
    </div> : <p className="career-bench-place">{scene.location || 'En el banquillo · Cara a cara'}</p>}
    <h2 className="career-live-title">{messageForProfile(event.title, career.profile)}</h2>
    {court ? <p className="career-live-story">{text}</p> : <figure className={'career-bench-dialogue' + (bar ? ' career-bar-dialogue' : '')}><figcaption>{scene.author.name}<span>te dice</span></figcaption><blockquote>{text}</blockquote></figure>}
    {scene.message && <p className="career-live-context">{messageForProfile(event.description, career.profile)}</p>}
  </>;
}
