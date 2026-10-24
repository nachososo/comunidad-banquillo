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
