// Published results are authoritative: never rescore them with today's roster.
export const getPublishedRoundRankings = (results = [], rounds = []) => {
  const schedule = new Map(rounds.map((round, index) => [round.name, { ...round, index }]));
  return results.filter((result) => Array.isArray(result.ranking) && result.ranking.length > 0)
    .map((result) => ({ ...result, matchId: schedule.get(result.round)?.matchId }))
    .sort((a, b) => (schedule.get(b.round)?.index ?? -1) - (schedule.get(a.round)?.index ?? -1)
      || b.round.localeCompare(a.round, 'es', { numeric: true }));
};

export const buildRoundLeaderboard = (result, teams = [], userId) => {
  const managers = new Map(teams.map((team) => [String(team.id), team]));
  const entries = (result?.ranking || []).map((entry) => {
    const team = managers.get(String(entry.id));
    return {
      ...entry, id: String(entry.id), points: Number(entry.points) || 0,
      manager: team?.manager_name || 'Manager', current: Boolean(userId && team?.user_id === userId),
      selectedIds: (entry.selectedIds || []).map(String), lineupSlots: entry.lineupSlots,
      roundName: result.round, matchId: result.matchId,
    };
  }).sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  return entries.map((entry, index) => ({
    ...entry, rank: entries.findIndex((other) => other.points === entry.points) + 1,
    winner: entry.points === entries[0].points,
  }));
};

export const buildBanquigerHonours = (results = [], rounds = [], teams = [], userId) => {
  const published = getPublishedRoundRankings(results, rounds);
  const seasonFor = (result) => rounds.find(round => round.name === result.round)?.season
    || result.round.match(/\d{4}[/-]\d{4}/)?.[0]?.replace('/', '-') || '';
  const victories = published.map(result => ({
    round: result.round, season: seasonFor(result),
    winners: buildRoundLeaderboard(result, teams, userId).filter(entry => entry.winner),
  }));
  const champions = [];
  for (const season of new Set(rounds.filter(round => round.automatic && round.season).map(round => round.season))) {
    const calendar = rounds.filter(round => round.automatic && round.season === season);
    // All scheduled games must be settled before awarding the league title.
    if (!calendar.length || !calendar.every(round => published.some(result => result.round === round.name))) continue;
    const totals = new Map();
    for (const result of published.filter(result => seasonFor(result) === season)) {
      for (const entry of buildRoundLeaderboard(result, teams, userId)) {
        const previous = totals.get(entry.id);
        totals.set(entry.id, { ...entry, points: (previous?.points || 0) + entry.points });
      }
    }
    const best = Math.max(...[...totals.values()].map(entry => entry.points));
    champions.push({ season, winners: [...totals.values()].filter(entry => entry.points === best) });
  }
  const counts = new Map();
  const addTitle = (winner, type) => {
    const current = teams.find(team => String(team.id) === winner.id);
    const entry = counts.get(winner.id) || { ...winner, team: current?.name || winner.team, roundWins: 0, leagueWins: 0 };
    entry[type] += 1;
    counts.set(winner.id, entry);
  };
  victories.forEach(victory => victory.winners.forEach(winner => addTitle(winner, 'roundWins')));
  champions.forEach(champion => champion.winners.forEach(winner => addTitle(winner, 'leagueWins')));
  const winners = [...counts.values()].sort((a, b) => b.leagueWins - a.leagueWins || b.roundWins - a.roundWins || a.id.localeCompare(b.id));
  return { victories, champions, winners, own: winners.find(winner => winner.current) };
};
