export const ATTRIBUTES = Object.freeze({ shooting: 'Tiro', passing: 'Pase', rebounding: 'Rebote', defense: 'Defensa', composure: 'Control de presión' });
export const POSITION_WEIGHTS = {
  Base: { shooting: .2, passing: .35, rebounding: .1, defense: .2, composure: .15 },
  Escolta: { shooting: .4, passing: .15, rebounding: .1, defense: .2, composure: .15 },
  Alero: { shooting: .3, passing: .15, rebounding: .2, defense: .25, composure: .1 },
  'Ala-pívot': { shooting: .2, passing: .1, rebounding: .3, defense: .3, composure: .1 },
  Pívot: { shooting: .15, passing: .05, rebounding: .35, defense: .35, composure: .1 },
};
const round = (n) => Math.round(n * 100) / 100;
const limit = (n) => round(Math.max(0, Math.min(100, n)));
export const uniformAttributes = (rating = 40) => Object.fromEntries(Object.keys(ATTRIBUTES).map((key) => [key, limit(rating)]));
export const attributesForCareer = (career) => career.attributes || uniformAttributes(career.overallExact ?? career.overall);
export const overallFromAttributes = (attributes, position) => round(Object.entries(POSITION_WEIGHTS[position]).reduce((total, [key, weight]) => total + attributes[key] * weight, 0));
export const shiftAttributes = (attributes, delta) => Object.fromEntries(Object.keys(ATTRIBUTES).map((key) => [key, limit(attributes[key] + delta)]));
export const applyAttributeEffects = (attributes, effects) => Object.fromEntries(Object.keys(ATTRIBUTES).map((key) => [key, limit(attributes[key] + (effects.overall || 0) + (effects[key] || 0))]));

export function initialAttributes(profile) {
  const offsets = {
    scorer: { shooting: 8, passing: -2, rebounding: -3, defense: -3, composure: 2 },
    anchor: { shooting: -4, passing: -3, rebounding: 6, defense: 8, composure: 0 },
    leader: { shooting: -2, passing: 8, rebounding: -3, defense: 0, composure: 5 },
    allround: {},
  };
  const raw = applyAttributeEffects(uniformAttributes(), offsets[profile.archetype]);
  return shiftAttributes(raw, 40 - overallFromAttributes(raw, profile.position));
}

// Own game-balance curves at 24 minutes, not measured municipal-league data.
// Nonlinear output separates ordinary contributors from elite specialists.
// Overall grants minutes elsewhere; it never directly grants scoring ability.
export function performanceRates(attributes, position, formRoll = .5) {
  const interior = ['Ala-pívot', 'Pívot'].includes(position);
  const skill = (key) => Math.max(0, Math.min(100, Number(attributes[key]) || 0)) / 100;
  const volatility = .18 - skill('composure') * .1;
  const form = 1 + (Math.max(0, Math.min(1, formRoll)) * 2 - 1) * volatility;
  return {
    points: 18 * skill('shooting') ** 4 * form,
    rebounds: (.3 + 5.2 * skill('rebounding') ** 1.7) * (interior ? 1.45 : .8),
    assists: (.15 + 3.5 * skill('passing') ** 1.8) * (position === 'Base' ? 1.55 : .75),
    steals: .08 + 1.4 * skill('defense') ** 1.8,
    blocks: (.02 + .8 * skill('defense') ** 2) * (interior ? 1.35 : .45),
  };
}

export function injuryChance(career, modifier = 0) {
  const base = Math.min(25, 4 + Math.max(0, career.age - 29) * .5 + (career.injuries || 0) * .75);
  return round(Math.max(0, Math.min(100, base + modifier)));
}

export function resolveSeasonHealth(career, effects, rng = Math.random, retiring = false) {
  const scheduled = career.settings.gamesPerSeason;
  const chance = injuryChance(career, effects.injuryRisk || 0);
  if (retiring) return { injuries: 0, gamesMissed: 0, injuryChance: 0, randomInjury: false, injuryCheckSkipped: true };
  const scriptedInjuries = effects.injuries || 0;
  const scriptedAbsence = Math.min(scheduled, effects.gamesMissed || 0);
  const skipped = scriptedInjuries > 0 || scriptedAbsence >= scheduled;
  const injured = !skipped && Math.max(0, Math.min(.999999999, rng())) * 100 < chance;
  const absence = injured ? 3 + Math.floor(Math.max(0, Math.min(.999999999, rng())) * 6) : 0;
  return { injuries: scriptedInjuries + Number(injured), gamesMissed: Math.min(scheduled, scriptedAbsence + absence), injuryChance: chance, randomInjury: injured, injuryCheckSkipped: skipped };
}
