export const normalizeStatsSeason = season => String(season || '').trim().replace('/', '-');

export function resolveStatsSeason(matches, team, fallback = '') {
  const seasons = [...new Set(matches.filter(match => match.team === team)
    .map(match => normalizeStatsSeason(match.season)).filter(season => /^\d{4}-\d{4}$/.test(season)))];
  return seasons.sort((a, b) => Number(b.slice(0, 4)) - Number(a.slice(0, 4)) || b.localeCompare(a))[0]
    || normalizeStatsSeason(fallback);
}

export function mergeStatsCalendar(localMatches, remoteMatches) {
  const localById = new Map(localMatches.map(match => [String(match.id), match]));
  const remoteTeams = new Set(remoteMatches.map(match => match.team));
  return [
    ...localMatches.filter(match => !remoteTeams.has(match.team)),
    ...remoteMatches.map(match => ({
      ...localById.get(String(match.id)), ...match,
      season: normalizeStatsSeason(match.season),
      date: match.match_date || match.date,
      time: (match.match_time || match.time || '').slice(0, 5),
    })),
  ];
}
