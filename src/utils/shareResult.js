import { DRAFT_POSITIONS } from '@/data/cdbPlayers.js';

export const getOrderedDraftTeam = (team) =>
  [...team].sort(
    (a, b) => DRAFT_POSITIONS.indexOf(a.draftPosition) - DRAFT_POSITIONS.indexOf(b.draftPosition),
  );

export const buildShareText = ({ team, result }) => {
  const lines = getOrderedDraftTeam(team).map((player) => `${player.draftPosition}: ${player.name} (${player.season})`);

  return [
    `He terminado ${result.recordInfo.record} en "18-0: ¿Podrás ganar la liga?"`,
    '',
    'Mi quinteto CDB:',
    ...lines,
    '',
    `Banquiller del año: ${result.mvp.name}`,
    `Química: ${Math.round(result.scores.chemistryScore)}`,
    `ADN Banquiller: ${Math.round(result.scores.adnScore)}`,
    '',
    '¿Puedes hacer el 18-0?',
  ].join('\n');
};

export const copyShareText = async ({ team, result }) => {
  const text = buildShareText({ team, result });

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return text;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);

  return text;
};
