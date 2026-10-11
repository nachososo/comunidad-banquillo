// Game-design parameters, independent of the published event catalogue.
export const POTENTIAL_BANDS = Object.freeze([
  Object.freeze({ min: 55, max: 69, weight: 30 }),
  Object.freeze({ min: 70, max: 79, weight: 50 }),
  Object.freeze({ min: 80, max: 89, weight: 18 }),
  Object.freeze({ min: 90, max: 97, weight: 2 }),
]);

const bounded = (n, min, max) => Math.min(max, Math.max(min, n));
const draw = (rng) => bounded(Number(rng()) || 0, 0, 0.999999999);
export const preciseRating = (n) => Math.round(bounded(n, 0, 100) * 100) / 100;

export function rollDevelopment(rng = Math.random) {
  const ticket = draw(rng) * 100;
  let boundary = 0;
  const band = POTENTIAL_BANDS.find((item) => { boundary += item.weight; return ticket < boundary; });
  const potential = band.min + Math.floor(draw(rng) * (band.max - band.min + 1));
  const rate = Math.round((0.8 + draw(rng) * 0.4) * 100) / 100;
  const maturationRoll = draw(rng);
  const maturation = maturationRoll < 0.2 ? 'early' : maturationRoll < 0.8 ? 'normal' : 'late';
  return { potential, rate, maturation };
}

// Inclusive age brackets. Late development starts slower, accelerates later,
// and retains its plateau longer; it does not merely grant more growth at 17.
const CURVES = {
  early: [[19, 5], [22, 3.3], [25, 1.5], [28, 0.5], [30, 0], [34, -0.8], [37, -1.6], [40, -2.4]],
  normal: [[19, 4], [22, 3.2], [25, 2.2], [28, 1.1], [31, 0.2], [34, -0.7], [37, -1.5], [40, -2.3]],
  late: [[19, 2.3], [22, 3.2], [25, 4], [28, 2.2], [31, 0.8], [33, 0.1], [36, -0.8], [38, -1.5], [40, -2.3]],
};

export const ageGrowth = (age, maturation = 'normal') =>
  (CURVES[maturation] || CURVES.normal).find(([lastAge]) => age <= lastAge)?.[1] ?? -2.3;

// Training still provides 85% of normal growth without playing time. Use the
// previous season to avoid a circular dependency between growth and minutes.
// No scoring feedback loop; a full medical absence is not penalised twice.
export function playingExperienceFactor(career) {
  const previous = career.seasons?.at(-1);
  if (!previous || previous.retired || previous.gamesMissed >= previous.scheduled) return 1;
  const minutes = Number(previous.minutesPerGame);
  if (!Number.isFinite(minutes)) return 1;
  return .85 + .15 * bounded(minutes / 24, 0, 1);
}

export function naturalDevelopment(career, development, gamesMissed = 0, rng = Math.random, evolutionPct = 0) {
  const starting = career.overallExact ?? career.overall;
  const base = ageGrowth(career.age, development.maturation);
  const variation = (draw(rng) - 0.5) * 0.7;
  const injuries = Math.max(0, career.injuries || 0);
  const injuryFactor = Math.max(0.55, 1 - injuries * 0.07);
  const availability = bounded(1 - gamesMissed / career.settings.gamesPerSeason, 0, 1);
  const gap = Math.max(0, development.potential - starting);
  let change;
  if (base >= 0) {
    const margin = bounded(gap / 12, 0, 1);
    const growth = Math.max(0, base * development.rate + variation) * margin * injuryFactor * availability * playingExperienceFactor(career) * Math.max(0, 1 + evolutionPct / 100);
    change = Math.min(gap, growth);
  } else {
    // An injured veteran can decline faster. Missing games never cancels ageing.
    change = Math.min(0, base + variation - Math.min(injuries, 8) * 0.05);
  }
  // Never snap a rating above potential back to it: event gains are retained.
  const overallExact = preciseRating(starting + change);
  return {
    overallExact,
    changeExact: Math.round((overallExact - starting) * 100) / 100,
    healthAffected: injuries > 0 || gamesMissed > 0,
  };
}
