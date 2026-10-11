import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { groupCareerTrophies } from '../../utils/careerTrophies.js';

function TrophyImage({ image, size = 96 }) {
  const [failed, setFailed] = useState(false);
  return failed ? <Trophy className="career-trophy-fallback" aria-hidden="true" />
    : <img src={image} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function CareerTrophyIcons({ awards, category, size = 'default' }) {
  const groups = groupCareerTrophies(awards, category);
  if (!groups.length) return null;
  return <span className={'career-trophy-icons is-' + size} aria-label={(category === 'collective' ? 'Títulos: ' : 'Premios individuales: ') + groups.map((group) => group.label + (group.count > 1 ? ' por ' + group.count : '')).join(', ')}>
    {groups.map((group) => <span className="career-trophy-icon" key={group.key} title={group.label + (group.count > 1 ? ' ×' + group.count : '')}>
      <TrophyImage image={group.image} size={size === 'season' ? 19 : 26} />
      {group.count > 1 && <small aria-hidden="true">×{group.count}</small>}
    </span>)}
  </span>;
}

export default function CareerTrophyCollection({ awards, category, compact = false }) {
  const groups = groupCareerTrophies(awards, category);
  if (!groups.length) return compact ? null : <p className="career-muted mt-3">Todavía sin premios.</p>;
  return <div className={'career-trophy-shelf' + (compact ? ' is-compact' : '')}>
    {groups.map((group) => <details className="career-trophy-card" key={group.key}>
      <summary title={group.label + ' · ' + group.count + (group.count === 1 ? ' vez' : ' veces')}>
        <span className="career-trophy-object"><TrophyImage image={group.image} />{group.count > 1 && <span className="career-trophy-count" aria-hidden="true">×{group.count}</span>}</span>
        <span className="career-trophy-label">{group.label}</span>
        <span className="sr-only"> · {group.count} {group.count === 1 ? 'premio' : 'premios'}. Ver temporadas y clubes.</span>
      </summary>
      <ul className="career-trophy-records" aria-label={'Historial de ' + group.label}>{group.records.map((award, index) => <li key={index}><strong>{award.title}</strong><span>{award.age} años · {award.club}</span></li>)}</ul>
    </details>)}
  </div>;
}

// Deliberately separate sample data: never stored, awarded or shared as a career.
export function CareerTrophyPreview() {
  const records = (title, age = 25) => ({ title, age, club: 'La Comunidad del Banquillo' });
  const collective = [records('Campeonato de liga municipal', 23), records('Campeonato de liga municipal', 27), records('Copa Interdistritos', 27)];
  const individual = [records('MVP de la temporada · Senior'), records('Máximo anotador · Senior'), records('Quinteto ideal · Senior', 24), records('Quinteto ideal · Senior', 26), records('Líder en asistencias · Senior'), records('Máximo reboteador'), records('Mejor defensor'), records('Sexto hombre'), records('Premio al compromiso')];
  return <section className="career-panel career-stack career-trophy-preview">
    <div><p className="career-kicker">Colección de prueba</p><h2>Los trofeos del Banquillo</h2><p className="career-muted mt-3">Muestra visual con premios ficticios. Toca un trofeo para ver el detalle; no añade premios a ninguna partida.</p></div>
    <div className="career-grid"><section><h3>Premios colectivos</h3><CareerTrophyCollection awards={collective} category="collective" /></section><section><h3>Premios individuales</h3><CareerTrophyCollection awards={individual} category="individual" /></section></div>
  </section>;
}
