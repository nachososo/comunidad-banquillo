export const parseMadeAttempt = (value) => {
  if (!value || value === '-') {
    return { made: 0, attempted: 0 };
  }

  const [made, attempted] = String(value).split('-').map(Number);

  return {
    made: Number.isFinite(made) ? made : 0,
    attempted: Number.isFinite(attempted) ? attempted : 0,
  };
};

export const formatPercentage = (made, attempted) => {
  if (!attempted) return '-';

  return `${Math.round((made / attempted) * 100)}%`;
};

export const formatStatPercentage = (value) => {
  const { made, attempted } = parseMadeAttempt(value);

  return formatPercentage(made, attempted);
};

export const getRebounds = (stat) => {
  if (!stat) return null;

  return (stat.oreb || 0) + (stat.dreb || 0);
};

export const getValuation = (stat, points) => {
  if (!stat) return null;

  const fg = parseMadeAttempt(stat.fg);
  const ft = parseMadeAttempt(stat.ft);
  const missedFieldGoals = fg.attempted - fg.made;
  const missedFreeThrows = ft.attempted - ft.made;

  return (
    (points ?? stat.points ?? 0) +
    getRebounds(stat) +
    (stat.assists || 0) +
    (stat.steals || 0) +
    (stat.blocks || 0) -
    missedFieldGoals -
    missedFreeThrows -
    (stat.turnovers || 0)
  );
};

export const mergeStatRows = ({ gameStats, advancedStats, players }) => {
  const gameStatsByPlayer = new Map(gameStats.map((stat) => [stat.playerId, stat]));
  const advancedStatsByPlayer = new Map(advancedStats.map((stat) => [stat.playerId, stat]));
  const playerIds = [...new Set([...gameStatsByPlayer.keys(), ...advancedStatsByPlayer.keys()])];

  return playerIds
    .map((playerId) => {
      const player = players.find((candidate) => candidate.id === playerId);
      if (!player) return null;

      const gameStat = gameStatsByPlayer.get(playerId);
      const advancedStat = advancedStatsByPlayer.get(playerId);
      const points = gameStat?.points ?? advancedStat?.points ?? 0;

      return {
        matchId: gameStat?.matchId ?? advancedStat.matchId,
        playerId,
        player,
        minutes: gameStat?.minutes ?? '-',
        points,
        advanced: advancedStat,
        rebounds: getRebounds(advancedStat),
        fgPct: advancedStat ? formatStatPercentage(advancedStat.fg) : '-',
        threePtPct: advancedStat ? formatStatPercentage(advancedStat.threePt) : '-',
        ftPct: advancedStat ? formatStatPercentage(advancedStat.ft) : '-',
        steals: advancedStat?.steals ?? null,
        turnovers: advancedStat?.turnovers ?? null,
        assists: advancedStat?.assists ?? null,
        fouls: advancedStat?.fouls ?? null,
        valuation: getValuation(advancedStat, points),
      };
    })
    .filter(Boolean);
};

export const buildAdvancedTotals = (stats) => {
  return stats.reduce(
    (totals, stat) => {
      if (!stat.advanced) return totals;

      const fg = parseMadeAttempt(stat.advanced.fg);
      const threePt = parseMadeAttempt(stat.advanced.threePt);
      const ft = parseMadeAttempt(stat.advanced.ft);

      totals.games += 1;
      totals.rebounds += stat.rebounds ?? 0;
      totals.steals += stat.steals ?? 0;
      totals.turnovers += stat.turnovers ?? 0;
      totals.assists += stat.assists ?? 0;
      totals.fouls += stat.fouls ?? 0;
      totals.valuation += stat.valuation ?? 0;
      totals.fgMade += fg.made;
      totals.fgAttempted += fg.attempted;
      totals.threePtMade += threePt.made;
      totals.threePtAttempted += threePt.attempted;
      totals.ftMade += ft.made;
      totals.ftAttempted += ft.attempted;

      return totals;
    },
    {
      games: 0,
      rebounds: 0,
      steals: 0,
      turnovers: 0,
      assists: 0,
      fouls: 0,
      valuation: 0,
      fgMade: 0,
      fgAttempted: 0,
      threePtMade: 0,
      threePtAttempted: 0,
      ftMade: 0,
      ftAttempted: 0,
    },
  );
};
