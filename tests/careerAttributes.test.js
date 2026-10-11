import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTES, POSITION_WEIGHTS, uniformAttributes, initialAttributes, overallFromAttributes, applyAttributeEffects, performanceRates, injuryChance, resolveSeasonHealth } from '../src/utils/careerAttributes.js';
import { naturalDevelopment } from '../src/utils/careerDevelopment.js';
import { createCareer, resolveSeason, advanceCareer, chanceFor, effectsText, validateConfig } from '../src/utils/careerEngine.js';
import { DEFAULT_CAREER_CONFIG as CONFIG, ARCHETYPES } from '../src/data/careerData.js';
import { buildCareerShareText } from '../src/utils/careerShare.js';

const profile = { name: 'Habilidades', number: 7, team: 'femenino', position: 'Base', archetype: 'allround' };
const neutral = { ...CONFIG.events[0], chance: 100, success: {}, failure: {} };
const career = (changes = {}) => ({ ...createCareer(profile, CONFIG, () => .5), pendingEvent: neutral, ...changes });
const round = (n) => Math.round(n * 100) / 100;

test('cinco habilidades y media inicial 40 en las veinte combinaciones de posición y estilo', () => {
  for (const [position, weights] of Object.entries(POSITION_WEIGHTS)) {
    assert.equal(round(Object.values(weights).reduce((sum, value) => sum + value, 0)), 1);
    for (const archetype of Object.keys(ARCHETYPES)) {
      const attrs = initialAttributes({ position, archetype });
      assert.deepEqual(Object.keys(attrs), Object.keys(ATTRIBUTES));
      assert.equal(overallFromAttributes(attrs, position), 40);
      for (const value of Object.values(attrs)) assert(value >= 0 && value <= 100);
    }
  }
  const scorer = initialAttributes({ ...profile, archetype: 'scorer' });
  assert(scorer.shooting > scorer.defense);
  assert.notDeepEqual(scorer, initialAttributes({ ...profile, archetype: 'anchor' }));
});

test('un +6 en tiro afecta solo al tiro y pesa distinto en cada posición; límites 0–100', () => {
  const before = uniformAttributes(), after = applyAttributeEffects(before, { shooting: 6 });
  assert.deepEqual(after, { ...before, shooting: 46 });
  assert.equal(overallFromAttributes(after, 'Escolta'), 42.4);
  assert.equal(overallFromAttributes(after, 'Pívot'), 40.9);
  assert.deepEqual(before, uniformAttributes());
  assert.equal(applyAttributeEffects(uniformAttributes(99), { shooting: 30 }).shooting, 100);
  assert.equal(applyAttributeEffects(uniformAttributes(1), { defense: -30 }).defense, 0);
  assert.deepEqual(applyAttributeEffects(before, { overall: 3 }), uniformAttributes(43));
});

test('tiro, pase, rebote y defensa generan sus propias estadísticas a igualdad de minutos', () => {
  const before = uniformAttributes(), base = performanceRates(before, 'Base');
  const mappings = { shooting: ['points'], passing: ['assists'], rebounding: ['rebounds'], defense: ['steals', 'blocks'] };
  for (const [attribute, stats] of Object.entries(mappings)) {
    const after = performanceRates({ ...before, [attribute]: 80 }, 'Base');
    for (const key of Object.keys(base)) {
      if (stats.includes(key)) assert(after[key] > base[key]);
      else assert.equal(after[key], base[key]);
    }
  }
});

test('el control de presión reduce volatilidad y ajusta los eventos decisivos, no asegura éxito', () => {
  const low = { ...uniformAttributes(), composure: 0 }, high = { ...low, composure: 100 };
  assert(performanceRates(high, 'Base', 0).points > performanceRates(low, 'Base', 0).points);
  assert(performanceRates(high, 'Base', 1).points < performanceRates(low, 'Base', 1).points);
  assert.equal(performanceRates(high, 'Base', .5).points, performanceRates(low, 'Base', .5).points);
  const event = { ...neutral, chance: 55, influence: 20, influenceAttribute: 'composure' };
  assert.equal(chanceFor(event, career({ attributes: low })), 35);
  assert.equal(chanceFor(event, career({ attributes: high })), 75);
  for (const chance of [0, 100]) assert.equal(chanceFor({ ...event, chance }, career({ attributes: high })), chance);
});

test('evolución multiplica solo el crecimiento positivo y respeta el potencial', () => {
  const c = career(), d = { potential: 85, rate: 1, maturation: 'normal' };
  const evolve = (state, pct) => naturalDevelopment(state, d, 0, () => .5, pct).changeExact;
  assert.equal(evolve(c, 50), round(evolve(c, 0) * 1.5));
  assert.equal(evolve(c, -100), 0);
  assert.equal(evolve({ ...c, age: 38 }, 50), evolve({ ...c, age: 38 }, 0));
  assert.equal(evolve({ ...c, overall: 85, overallExact: 85 }, 200), 0);
});

test('habilidades permanentes; evolución y riesgo caducan sin modificar los rasgos ocultos', () => {
  const c = career({ pendingEvent: { ...neutral, success: { shooting: 6, evolutionPct: 50, injuryRisk: 5 } } });
  const initial = structuredClone(c);
  const first = resolveSeason(c, true, () => .5);
  assert.equal(first.lastResult.injuryChance, 9);
  assert.equal(first.lastResult.evolutionPct, 50);
  assert.equal(round(first.attributes.shooting - first.attributes.defense), 6);
  const next = advanceCareer(first, [neutral], () => .5);
  const second = resolveSeason(next, false, () => .5);
  assert.equal(second.lastResult.injuryChance, 4);
  assert.equal(second.lastResult.evolutionPct, 0);
  assert.equal(round(second.attributes.shooting - second.attributes.defense), 6);
  assert.deepEqual(second.development, initial.development);
  assert.deepEqual(c, initial);
  assert.deepEqual(second.seasons[0].attributes, first.attributes);
  assert.notEqual(second.seasons[0].attributes, first.attributes);
  assert.doesNotMatch(buildCareerShareText(second, true), /Habilidades:|Control de presión|injuryChance|overallExact/);
  assert.doesNotMatch(buildCareerShareText(second, true), /potential|maturation|development/);
});

test('riesgo anual base, edad, antecedentes y modificadores en puntos porcentuales', () => {
  const c = career();
  assert.equal(injuryChance(c), 4);
  assert.equal(injuryChance(c, 5), 9);
  assert.equal(injuryChance(c, -100), 0);
  assert.equal(injuryChance(c, 100), 100);
  assert(injuryChance({ ...c, age: 35, injuries: 3 }) > injuryChance(c));
  assert.equal(injuryChance({ ...c, age: 40, injuries: 100 }), 25);
  const hit = resolveSeasonHealth(c, {}, () => 0);
  assert.equal(hit.injuries, 1); assert.equal(hit.gamesMissed, 3);
  const miss = resolveSeasonHealth(c, {}, () => .99);
  assert.equal(miss.injuries, 0); assert.equal(miss.gamesMissed, 0);
  assert.equal(resolveSeasonHealth(c, { injuryRisk: -100 }, () => 0).injuries, 0);
  assert.equal(resolveSeasonHealth(c, { injuryRisk: 100 }, () => .999).gamesMissed, 8);
});

test('no duplica lesiones explícitas ni sortea riesgo al retirarse o perder todo el año', () => {
  const c = career(), forbidden = () => { throw new Error('No debe sortear'); };
  const scripted = resolveSeasonHealth(c, { injuries: 2, gamesMissed: 10, injuryRisk: 100 }, forbidden);
  assert.equal(scripted.injuries, 2); assert.equal(scripted.gamesMissed, 10); assert.equal(scripted.randomInjury, false);
  const absent = resolveSeasonHealth(c, { gamesMissed: 40 }, forbidden);
  assert.equal(absent.gamesMissed, c.settings.gamesPerSeason);
  assert.equal(absent.injuryCheckSkipped, true);
  const retired = resolveSeasonHealth(c, { injuryRisk: 100, injuries: 5 }, forbidden, true);
  assert.equal(retired.injuries, 0); assert.equal(retired.gamesMissed, 0);
});

test('rechazar evita los modificadores del evento pero no la lesión natural anual', () => {
  const c = career({ pendingEvent: { ...neutral, success: { injuryRisk: -100, shooting: 30, evolutionPct: 200 } } });
  const rejected = resolveSeason(c, false, () => 0);
  assert.equal(rejected.lastResult.injuryChance, 4);
  assert.equal(rejected.lastResult.randomInjury, true);
  assert.equal(rejected.lastResult.evolutionPct, 0);
  assert.equal(rejected.attributes.shooting, rejected.attributes.defense);
  const accepted = resolveSeason(c, true, () => 0);
  assert.equal(accepted.lastResult.injuries, 0);
  assert.equal(accepted.lastResult.injuryChance, 0);
});

test('catálogo válido sin cambios directos de media; unidades y campos del editor validados', () => {
  assert.deepEqual(validateConfig(CONFIG), []);
  for (const event of CONFIG.events) for (const outcome of ['success', 'failure']) assert(!('overall' in event[outcome]));
  assert.match(effectsText({ shooting: 6, evolutionPct: 25, injuryRisk: 5 }), /Tiro \+6 pts \(permanente\).*Evolución \+25%.*Riesgo de lesión \+5 pp/);
  for (const change of [{ influenceAttribute: 'invalid' }, { success: { shooting: 101 } }, { failure: { injuryRisk: -101 } }, { success: { evolutionPct: 201 } }]) {
    assert(validateConfig({ ...CONFIG, events: [{ ...neutral, ...change }] }).length > 0);
  }
});
