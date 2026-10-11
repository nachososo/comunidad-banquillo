// Percentages for the current club's season, not a simulated shared league table.
export const LEAGUE_TIERS = {
  1: { base: 0.1, max: 1, matchChance: 28 },
  2: { base: 2, max: 8, matchChance: 43 },
  3: { base: 10, max: 25, matchChance: 58 },
  4: { base: 25, max: 50, matchChance: 70 },
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rating = (overall) => clamp(Number(overall) || 0, 0, 100);
export const leagueTierForClub = (club) => club?.id === 'cdb' ? 3 : LEAGUE_TIERS[club?.tier] ? club.tier : 1;
export const leagueRangeForClub = (club) => {
  const defaults = LEAGUE_TIERS[leagueTierForClub(club)];
  return { base: club?.leagueBaseChance ?? defaults.base, max: club?.leagueMaxChance ?? defaults.max };
};
export function leagueChanceForClub(club, overall) {
  const { base, max } = leagueRangeForClub(club);
  return base + (max - base) * rating(overall) / 100;
}

export function validateLeagueChances(club) {
  for (const key of ['leagueBaseChance', 'leagueMaxChance']) {
    const value = club[key];
    if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0.01 || value > 99.99)) {
      return ['Liga municipal: los porcentajes deben estar entre 0,01 y 99,99.'];
    }
  }
  const { base, max } = leagueRangeForClub(club);
  return max <= base ? ['Liga municipal: la probabilidad con media 100 debe superar a la de media 0.'] : [];
}

export function simulateMunicipalLeague(club, overall, scheduled, difficulty, winningShots, rng) {
  const leagueTier = leagueTierForClub(club);
  const leagueChance = leagueChanceForClub(club, overall);
  const draw = () => clamp(Number(rng()) || 0, 0, 0.999999999);
  const leagueChampion = draw() * 100 < leagueChance;
  const matchChance = clamp(LEAGUE_TIERS[leagueTier].matchChance + (rating(overall) - 50) * .2 + (50 - difficulty) * .3, 10, 90);
  let wins = 0;
  for (let game = 0; game < scheduled; game++) if (draw() * 100 < matchChance) wins++;
  // Generate a record consistent with the drawn outcome. A strong record alone
  // no longer awards the title; non-champions can still have excellent seasons.
  wins = leagueChampion ? Math.max(wins, Math.ceil(scheduled * .75)) : Math.min(wins, scheduled - 1);
  // Explicit winning-shot effects always retain their promised team victories,
  // even when an administrator configures one for every scheduled game.
  wins = Math.min(scheduled, Math.max(wins, winningShots));
  return { wins, losses: scheduled - wins, leagueTier, leagueChance, leagueChampion };
}
