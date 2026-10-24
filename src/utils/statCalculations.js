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
  if (!stat || (stat.oreb == null && stat.dreb == null)) return null;

  return (stat.oreb || 0) + (stat.dreb || 0);
};

export const getValuation = (stat, points) => {
  if (!stat) return null;
  // Only explicitly sourced federation imports override the usual game formula.
  if (['federation', 'federation-direct'].includes(stat.valuationSource) && stat.valuation != null &&
      String(stat.valuation).trim() !== '' && Number.isFinite(Number(stat.valuation))) {
    return Number(stat.valuation);
  }

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
    (stat.turnovers || 0) -
    (stat.fouls || 0)
  );
};

const hasStatValue = value => value !== null && value !== undefined &&
  String(value).trim() !== '' && Number.isFinite(Number(value));

const hasShotData = value => {
  if (typeof value !== 'string' || !/^\d+-\d+$/.test(value)) return false;
  const { made, attempted } = parseMadeAttempt(value);
  return made <= attempted;
};

// Only known statistics contribute to a season summary. Federation-only
// imports supply points, timed minutes and free throws for these summaries.
export const getStatCoverage = stat => {
  const basicOnly = ['federation', 'federation-direct'].includes(stat?.valuationSource);
  const numeric = field => !basicOnly && hasStatValue(stat?.[field]);
  return {
    rebounds: numeric('oreb') && numeric('dreb'),
    steals: numeric('steals'), assists: numeric('assists'),
    fouls: numeric('fouls'), turnovers: numeric('turnovers'),
    valuation: !basicOnly && (hasStatValue(stat?.valuation) ||
      (hasShotData(stat?.fg) && hasShotData(stat?.ft) &&
       ['oreb','dreb','assists','steals','blocks','turnovers','fouls'].every(numeric))),
    fg: !basicOnly && hasShotData(stat?.fg),
    threePt: !basicOnly && hasShotData(stat?.threePt),
    ft: hasShotData(stat?.ft),
  };
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
      const coverage = getStatCoverage(advancedStat);

      return {
        matchId: gameStat?.matchId ?? advancedStat.matchId,
        playerId,
        player,
        minutes: gameStat?.minutes ?? '-',
        points,
        advanced: advancedStat,
        coverage,
        rebounds: coverage.rebounds ? getRebounds(advancedStat) : null,
        fgPct: coverage.fg ? formatStatPercentage(advancedStat.fg) : '-',
        threePtPct: coverage.threePt ? formatStatPercentage(advancedStat.threePt) : '-',
        ftPct: coverage.ft ? formatStatPercentage(advancedStat.ft) : '-',
        steals: coverage.steals ? Number(advancedStat.steals) : null,
        turnovers: coverage.turnovers ? Number(advancedStat.turnovers) : null,
        assists: coverage.assists ? Number(advancedStat.assists) : null,
        fouls: coverage.fouls ? Number(advancedStat.fouls) : null,
        valuation: coverage.valuation ? (hasStatValue(advancedStat.valuation) ? Number(advancedStat.valuation) : getValuation(advancedStat, points)) : null,
      };
    })
    .filter(Boolean);
};

export const buildAdvancedTotals = stats => {
  const metrics = ['rebounds','steals','turnovers','assists','fouls','valuation'];
  const totals = {
    games: 0, ...Object.fromEntries(metrics.map(key => [key, 0])),
    counts: Object.fromEntries([...metrics,'fg','threePt','ft'].map(key => [key, 0])),
    fgMade: 0, fgAttempted: 0, threePtMade: 0, threePtAttempted: 0, ftMade: 0, ftAttempted: 0,
  };
  for (const stat of stats) {
    if (!stat.advanced) continue;
    totals.games += 1;
    const coverage = stat.coverage || getStatCoverage(stat.advanced);
    for (const key of metrics) {
      if (!coverage[key] || !hasStatValue(stat[key])) continue;
      totals[key] += Number(stat[key]);
      totals.counts[key] += 1;
    }
    for (const key of ['fg','threePt','ft']) {
      if (!coverage[key]) continue;
      const pair = parseMadeAttempt(stat.advanced[key]);
      totals[key + 'Made'] += pair.made;
      totals[key + 'Attempted'] += pair.attempted;
      totals.counts[key] += 1;
    }
  }
  return totals;
};
