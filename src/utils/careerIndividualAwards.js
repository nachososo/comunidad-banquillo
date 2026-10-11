// The simulator has no full line-up. Playing time is the explicit proxy for
// the annual role; this adds no random draws and does not change performance.
export function seasonRoleFor(games, minutesPerGame) {
  if (!games) return 'inactive';
  return minutesPerGame >= 28 ? 'starter' : minutesPerGame >= 20 ? 'sixth' : 'rotation';
}

export const SEASON_ROLE_LABELS = { inactive: 'Sin participación', starter: 'Titular', sixth: 'Rotación de banquillo', rotation: 'Rotación' };

export function isMvpSeason(stats, overall) {
  if (!stats?.games || stats.games < Math.ceil(stats.scheduled * .75) || stats.minutesPerGame < 28 || overall < 85) return false;
  const averages = stats.averages || {};
  const impact = (averages.points || 0)
    + (averages.rebounds || 0) * 1.2
    + (averages.assists || 0) * 1.5
    + ((averages.steals || 0) + (averages.blocks || 0)) * 2;
  const decidedGames = (stats.wins || 0) + (stats.losses || 0);
  const winRate = decidedGames ? (stats.wins || 0) / decidedGames : 0;
  return impact >= 34 && winRate >= .625;
}

export function additionalIndividualAwards(stats, overall, attributes, rng = Math.random) {
  // Do not reward a tiny sample or a year missed through injury.
  if (!stats.games || stats.games < Math.ceil(stats.scheduled / 2)) return [];
  const awards = [];
  const draw = () => Math.max(0, Math.min(0.999999999, Number(rng()) || 0));
  if (stats.averages.rebounds >= 8 && draw() < .4) awards.push('Máximo reboteador');
  if (attributes.defense >= 75 && stats.averages.steals + stats.averages.blocks >= 2 && draw() < .35) awards.push('Mejor defensor');
  if (stats.role === 'sixth' && overall >= 60 && stats.averages.points >= 10 && draw() < .3) awards.push('Sexto hombre');
  return awards;
}
