import test from 'node:test';
import assert from 'node:assert/strict';
import { POTENTIAL_BANDS, rollDevelopment, ageGrowth, naturalDevelopment } from '../src/utils/careerDevelopment.js';
import { createCareer, resolveSeason, advanceCareer, eventAppearanceWeight, selectEvent } from '../src/utils/careerEngine.js';
import { DEFAULT_CAREER_CONFIG as CONFIG, DEFAULT_CAREER_EVENTS as EVENTS } from '../src/data/careerData.js';
import { buildCareerShareText } from '../src/utils/careerShare.js';
import { uniformAttributes, overallFromAttributes } from '../src/utils/careerAttributes.js';

const profile = { name: 'Prueba desarrollo', number: 7, team: 'femenino', position: 'Base', archetype: 'allround' };
const seeded = (seed = 123) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const sequence = (...values) => { let at = 0; return () => values[at++]; };
const career = (changes = {}) => ({ ...createCareer(profile, CONFIG, () => 0.5), ...changes, attributes: changes.attributes ?? uniformAttributes(changes.overallExact ?? changes.overall ?? 40) });
const traits = (changes = {}) => ({ potential: 85, rate: 1, maturation: 'normal', ...changes });
const neutral = { ...EVENTS[0], chance: 100, success: {}, failure: {} };

test('bandas de potencial exactas 30/50/18/2 y límites sin huecos', () => {
  assert.deepEqual(POTENTIAL_BANDS.map((band) => band.weight), [30, 50, 18, 2]);
  for (const [ticket, low, high] of [[0, 55, 69], [.299999, 55, 69], [.3, 70, 79], [.799999, 70, 79], [.8, 80, 89], [.979999, 80, 89], [.98, 90, 97], [.9999999, 90, 97]]) {
    assert.equal(rollDevelopment(sequence(ticket, 0, 0, .5)).potential, low);
    assert.equal(rollDevelopment(sequence(ticket, .999999, .999999, .5)).potential, high);
  }
});

test('100.000 perfiles reproducibles respetan potencial, ritmo y distribución de maduración', () => {
  const rng = seeded(), counts = [0, 0, 0, 0], maturity = { early: 0, normal: 0, late: 0 };
  for (let i = 0; i < 100000; i++) {
    const d = rollDevelopment(rng);
    assert(Number.isInteger(d.potential)); assert(d.rate >= .8 && d.rate <= 1.2);
    const band = POTENTIAL_BANDS.findIndex((b) => d.potential >= b.min && d.potential <= b.max);
    assert(band >= 0); counts[band]++; maturity[d.maturation]++;
  }
  counts.forEach((n, i) => assert(Math.abs(n / 1000 - POTENTIAL_BANDS[i].weight) < .5));
  for (const [key, expected] of [['early', 20], ['normal', 60], ['late', 20]]) assert(Math.abs(maturity[key] / 1000 - expected) < .5);
});

test('mismo inicio 40; rasgos independientes de nombre, posición y arquetipo', () => {
  const a = createCareer(profile, CONFIG, seeded()), b = createCareer({ ...profile, name: 'Otro', position: 'Pívot', archetype: 'scorer' }, CONFIG, seeded());
  assert.deepEqual(a.development, b.development);
  assert.equal(a.overall, 40); assert.equal(a.overallExact, 40);
  const other = createCareer(profile, CONFIG, () => .999);
  assert.notDeepEqual(a.development, other.development); assert.equal(other.overall, 40);
});

test('los rasgos se sortean una vez y se conservan en toda la carrera sin mutar estados previos', () => {
  let c = career(); const original = structuredClone(c), d = structuredClone(c.development);
  while (c.phase !== 'retired') c = c.phase === 'event' ? resolveSeason(c, false, seeded(c.age)) : advanceCareer(c, EVENTS, seeded(c.age));
  assert.deepEqual(c.development, d); assert.equal(c.seasons.length, 24);
  assert.equal(original.seasons.length, 0); assert.equal(original.overallExact, 40);
  assert(!c.seasons.some((year) => 'development' in year || 'potential' in year));
  assert.doesNotMatch(buildCareerShareText(c, true), /potential|maturation|development|Potencial:/);
});

test('maduración tardía crece menos al inicio, más después y retrasa el declive', () => {
  assert(ageGrowth(17, 'late') < ageGrowth(17, 'early'));
  assert(ageGrowth(24, 'late') > ageGrowth(24, 'early'));
  assert(ageGrowth(32, 'early') < 0); assert(ageGrowth(32, 'late') > 0);
  for (const maturation of ['early', 'normal', 'late']) assert(ageGrowth(40, maturation) < 0);
});

test('ritmo propio acelera la evolución; acercarse al potencial la frena', () => {
  const c = career(), evolve = (state, d) => naturalDevelopment(state, d, 0, () => .5).changeExact;
  assert(evolve(c, traits({ rate: 1.2 })) > evolve(c, traits({ rate: .8 })));
  assert(evolve({ ...c, overall: 84, overallExact: 84 }, traits()) < evolve(c, traits()));
  const near = naturalDevelopment({ ...c, overall: 85, overallExact: 84.99 }, traits(), 0, () => .999);
  assert(near.overallExact <= 85);
  assert.equal(naturalDevelopment({ ...c, overall: 85, overallExact: 85 }, traits(), 0, () => .999).changeExact, 0);
});

test('los decimales se acumulan aunque la media visible no cambie un año', () => {
  let c = career({ age: 29, overall: 70, overallExact: 70, development: traits(), pendingEvent: neutral });
  c = resolveSeason(c, false, () => .5);
  assert.equal(c.overall, 70); assert.equal(c.overallExact, 70.2);
  c = resolveSeason(advanceCareer(c, EVENTS, () => 0), false, () => .5);
  assert.equal(c.overall, 70); assert.equal(c.overallExact, 70.4);
  c = resolveSeason(advanceCareer(c, EVENTS, () => 0), false, () => .5);
  assert.equal(c.overall, 71); assert.equal(c.overallExact, 70.6);
});

test('evento +3 supera el potencial y su bonus no se revierte al año siguiente', () => {
  let c = career({ age: 25, overall: 65, overallExact: 65, development: traits({ potential: 65 }), pendingEvent: { ...neutral, success: { overall: 3 } } });
  c = resolveSeason(c, true, () => .5);
  assert.equal(c.overallExact, 68); assert.equal(c.lastResult.eventOverallChangeExact, 3);
  c = resolveSeason(advanceCareer(c, EVENTS, () => 0), false, () => .5);
  assert.equal(c.overallExact, 68); assert.equal(c.lastResult.naturalChangeExact, 0);
});

test('lesiones y bajas reducen crecimiento, sin penalizar a quien rechaza el evento', () => {
  const c = career({ development: traits(), pendingEvent: { ...neutral, success: { injuries: 1, gamesMissed: 12 } } });
  const healthy = naturalDevelopment(c, c.development, 0, () => .5);
  const injured = naturalDevelopment({ ...c, injuries: 5 }, c.development, 0, () => .5);
  assert(injured.changeExact < healthy.changeExact);
  const accepted = resolveSeason(c, true, () => .5), rejected = resolveSeason(c, false, () => .5);
  assert.equal(accepted.lastResult.naturalChangeExact, rejected.lastResult.naturalChangeExact / 2);
  assert.equal(rejected.injuries, 0); assert.equal(rejected.lastResult.healthAffected, false);
  assert.equal(naturalDevelopment(c, c.development, 24, () => .5).changeExact, 0);
  const old = { ...c, age: 38 };
  assert(naturalDevelopment(old, c.development, 24, () => .5).changeExact < 0);
  assert(naturalDevelopment({ ...old, injuries: 8 }, c.development, 0, () => .5).changeExact < naturalDevelopment(old, c.development, 0, () => .5).changeExact);
});

test('más lesiones aumentan aparición de retirada por lesiones, no otras decisiones', () => {
  const retirement = EVENTS.find((e) => e.id === 'retire-injuries');
  const c = career({ age: 30, injuries: 1, appearances: {} });
  assert.equal(eventAppearanceWeight(retirement, c), retirement.weight);
  assert.equal(eventAppearanceWeight(retirement, { ...c, injuries: 5 }), retirement.weight * 2);
  assert.equal(eventAppearanceWeight(retirement, { ...c, injuries: 100 }), retirement.weight * 3);
  assert.equal(eventAppearanceWeight(neutral, { ...c, injuries: 100 }), neutral.weight);
  const other = { ...neutral, id: 'other', weight: retirement.weight };
  assert.equal(selectEvent([retirement, other], c, () => .6).id, 'other');
  assert.equal(selectEvent([retirement, other], { ...c, injuries: 5 }, () => .6).id, retirement.id);
  assert.equal(selectEvent([retirement, other], { ...c, age: 29, injuries: 5 }, () => 0).id, 'other');
});

test('retirada conserva media exacta y no consume progresión anual', () => {
  const c = career({ age: 35, overall: 72, overallExact: 72.23, injuries: 5, pendingEvent: EVENTS.find((e) => e.id === 'retire-injuries') });
  const retired = resolveSeason(c, true, () => .5);
  assert.equal(retired.phase, 'retired'); assert.equal(retired.overallExact, 72.23);
  assert.equal(retired.lastResult.naturalChangeExact, 0); assert.equal(retired.lastResult.games, 0);
});

test('límites 0–100 y desglose exacto y visible coherentes en 1.000 carreras', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const rng = seeded(seed); let c = createCareer(profile, CONFIG, rng);
    while (c.phase !== 'retired') {
      c = c.phase === 'event' ? resolveSeason(c, c.pendingEvent.category !== 'retirement' && rng() < .7, rng) : advanceCareer(c, EVENTS, rng);
    }
    for (const year of c.seasons) {
      assert(Number.isFinite(year.overallExact) && year.overallExact >= 0 && year.overallExact <= 100);
      assert.equal(year.overall, Math.round(year.overallExact));
      assert.equal(year.overallExact, overallFromAttributes(year.attributes, c.profile.position));
      for (const value of Object.values(year.attributes)) assert(Number.isFinite(value) && value >= 0 && value <= 100);
      assert.equal(year.startingOverall + year.naturalChange + year.eventOverallChange, year.overall);
      assert(Math.abs(year.startingOverallExact + year.naturalChangeExact + year.eventOverallChangeExact - year.overallExact) < 1e-8);
    }
  }
  for (const [start, effect, end] of [[99.7, 3, 100], [.1, -3, 0]]) {
    const c = resolveSeason(career({ age: 29, overall: Math.round(start), overallExact: start, development: traits({ potential: start }), pendingEvent: { ...neutral, success: { overall: effect } } }), true, () => .5);
    assert.equal(c.overallExact, end);
  }
});

test('una partida antigua en memoria adopta rasgos una sola vez y conserva sus años', () => {
  let old = career(); delete old.development; delete old.overallExact; delete old.attributes; old.version = 2;
  const original = structuredClone(old);
  let c = resolveSeason(old, false, seeded()), d = structuredClone(c.development);
  assert.equal(c.version, 4); assert.equal(c.seasons.length, 1);
  c = resolveSeason(advanceCareer(c, EVENTS, () => 0), false, seeded(100));
  assert.deepEqual(c.development, d); assert.equal(c.seasons.length, 2);
  assert.deepEqual(old, original);
});
