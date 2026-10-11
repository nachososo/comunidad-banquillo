import React from 'react';
import { ATTRIBUTES } from '../../utils/careerAttributes.js';

export default function CareerAttributes({ attributes, previous, position }) {
  if (!attributes) return null;
  return <section aria-label="Habilidades del jugador" className="career-attributes">
    <h3>Tu juego</h3>
    <dl>{Object.entries(ATTRIBUTES).map(([key, label]) => {
      const delta = previous ? Math.round((attributes[key] - previous[key]) * 100) / 100 : 0;
      return <div key={key}><div className="career-attribute-label"><dt>{label}</dt><dd>{Math.round(attributes[key])}{previous && delta !== 0 && <small className={delta > 0 ? 'career-result-success' : 'career-result-failure'}> ({delta > 0 ? '+' : ''}{delta.toLocaleString('es-ES')})</small>}</dd></div><progress max={100} value={attributes[key]} aria-label={label} /></div>;
    })}</dl>
    <p className="career-small career-muted">Habilidades de 0 a 100. Tu media las pondera para la posición de {position}. Más control de presión significa más estabilidad.</p>
  </section>;
}
