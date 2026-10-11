import { careerSummary } from './careerEngine.js';
import { STAGES, START_AGE } from '../data/careerData.js';
import { interdistrictsResultText } from './careerInterdistricts.js';

export const CAREER_SHARE_URL = 'https://comunidaddelbanquillo.es/adn-banquiller';

export function buildCareerShareText(career, detailed = false) {
  const summary = careerSummary(career);
  const lines = [
    'Mi carrera en ADN Banquiller',
    career.profile.name + ' · #' + career.profile.number + ' · ' + career.profile.position,
    'De los ' + START_AGE + ' a los ' + career.retirementAge + ' años · ' + summary.seasonsPlayed + ' temporadas jugadas',
    'Media más alta: ' + summary.peakOverall,
    summary.games + ' partidos · ' + summary.averages.points.toFixed(1) + ' PTS · ' + summary.averages.rebounds.toFixed(1) + ' REB · ' + summary.averages.assists.toFixed(1) + ' AST por partido',
    'Palmarés: ' + summary.collectiveAwards.length + ' premios colectivos y ' + summary.individualAwards.length + ' individuales',
    'Clubes: ' + summary.clubs.map((club) => club.name + ' (' + club.fromAge + '–' + club.toAge + ' años)').join(' → '),
  ];
  if (detailed) {
    lines.push('', 'TEMPORADA A TEMPORADA');
    for (const year of career.seasons) {
      lines.push(year.age + ' años · ' + STAGES[year.category] + ' · ' + year.club.name + ' · Media ' + year.overall + ' · ' + year.games + ' PJ · ' + year.averages.points.toFixed(1) + ' PTS / ' + year.averages.rebounds.toFixed(1) + ' REB / ' + year.averages.assists.toFixed(1) + ' AST');
      if (year.individualAwards.length || year.collectiveAwards.length) lines.push('Premios: ' + [...year.collectiveAwards, ...year.individualAwards].join(', '));
      if (year.interdistrictsQualified) lines.push(interdistrictsResultText(year));
      lines.push(year.event.title + ' · ' + (year.event.accepted ? (year.event.success ? 'Aceptado: éxito' : 'Aceptado: fallo') : 'Rechazado'));
    }
  }
  lines.push('', '¿Qué historia escribirás tú?', CAREER_SHARE_URL);
  return lines.join('\n');
}

export function careerShareOptions(career) {
  const text = buildCareerShareText(career);
  const url = encodeURIComponent(CAREER_SHARE_URL);
  const encoded = encodeURIComponent(text);
  const short = career.profile.name + ' en ADN Banquiller: de los ' + START_AGE + ' a los ' + career.retirementAge + ' años. Media máxima ' + career.peakOverall + '. ¿Qué carrera conseguirías tú? ' + CAREER_SHARE_URL;
  return [
    { label: 'X / Twitter', href: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(short) },
    { label: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + url + '&quote=' + encoded },
    { label: 'Bluesky', href: 'https://bsky.app/intent/compose?text=' + encodeURIComponent(short) },
    { label: 'WhatsApp', href: 'https://wa.me/?text=' + encoded },
    { label: 'Telegram', href: 'https://t.me/share/url?url=' + url + '&text=' + encoded },
    { label: 'Reddit', href: 'https://www.reddit.com/submit?url=' + url + '&title=' + encodeURIComponent(short) },
  ];
}

export async function copyCareerText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Use the same document fallback as 18-0. */ }
  }
  const focused = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.cssText = 'position:fixed;opacity:0;inset:0;pointer-events:none';
  // Keep the field inside an open modal: browsers make the background inert.
  (document.querySelector('dialog[open]') || document.body).appendChild(textarea);
  textarea.select();
  let copied = false;
  try { copied = document.execCommand('copy'); }
  finally { textarea.remove(); focused?.focus?.(); }
  if (!copied) throw new Error('No se pudo copiar. Puedes seleccionar el texto del resumen manualmente.');
}
