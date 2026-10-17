import { normalizeStatsSeason } from './statsCaptureCalendar.js';

export function mergePlayerMatchStats(localRows, remoteRows = []) {
  return [...new Map([...localRows, ...remoteRows].map(row => [String(row.matchId), row])).values()];
}

export function getPlayerSeasonOptions(calendar, rows, team) {
  return [...new Set([
    ...calendar.filter(match => match.team === team).map(match => normalizeStatsSeason(match.season)),
    ...rows.map(row => normalizeStatsSeason(row.match?.season)),
  ].filter(season => /^\d{4}-\d{4}$/.test(season)))].sort((a, b) => b.localeCompare(a));
}

export function statMinutesToSeconds(minutes) {
  const match = String(minutes ?? '').trim().match(/^(\d+):(\d{2})$/);
  if (!match || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function summarizePlayerSeason(rows) {
  // A published row without timed minutes is a game; explicit 00:00 is a DNP.
  const playedGames = rows.filter(row => statMinutesToSeconds(row.minutes) !== 0);
  const tracked = playedGames.map(row => statMinutesToSeconds(row.minutes));
  const totalSeconds = tracked.reduce((sum, seconds) => sum + (seconds || 0), 0);
  const roundedSeconds = Math.round(totalSeconds / (playedGames.length || 1));
  return {
    playedGames,
    totalPoints: playedGames.reduce((sum, row) => sum + (Number(row.points) || 0), 0),
    averagePoints: playedGames.length ? (playedGames.reduce((sum, row) => sum + (Number(row.points) || 0), 0) / playedGames.length).toFixed(1) : '0.0',
    averageMinutes: playedGames.length && tracked.every(seconds => seconds !== null)
      ? `${Math.floor(roundedSeconds / 60)}:${String(roundedSeconds % 60).padStart(2, '0')}` : '-',
  };
}

export function playerCaptureMinutes(playerId, participatedIds, events) {
  return participatedIds.map(String).includes(String(playerId)) ||
    events.some(event => event.teamSide === 'own' && String(event.playerId) === String(playerId)) ? null : '00:00';
}

export function hasRecordedGameAppearance(game) {
  return Boolean(game && (game.minutes === null || !['00:00', '0:00', '-', ''].includes(String(game.minutes ?? ''))));
}
