import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonMinutesFor } from '../src/utils/careerMinutes.js';
import { createCareer, resolveSeason, advanceCareer } from '../src/utils/careerEngine.js';
import { uniformAttributes } from '../src/utils/careerAttributes.js';
import { DEFAULT_CAREER_CONFIG, STARTING_CLUB } from '../src/data/careerData.js';

const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };

test('17 años y media 44 en el Banquillo: 0–5 minutos, incluidos ambos extremos', () => {
  const outcomes = new Set();
  for (let i = 0; i <= 100; i++) {
    const minutes = seasonMinutesFor(17, 44, STARTING_CLUB, i / 100);
    assert(minutes >= 0 && minutes <= 5);
    outcomes.add(minutes);
  }
  assert(outcomes.has(0) && outcomes.has(5));
});

test('la media manda, la adaptación es gradual y el club fuerte exige más', () => {
  for (let rating = 40; rating < 100; rating++) {
    assert(seasonMinutesFor(17, rating + 1, STARTING_CLUB) >= seasonMinutesFor(17, rating, STARTING_CLUB));
  }
  assert(seasonMinutesFor(17, 87, STARTING_CLUB) >= 28);
  for (let age = 17; age < 21; age++) {
    assert.equal(seasonMinutesFor(age + 1, 44, STARTING_CLUB) - seasonMinutesFor(age, 44, STARTING_CLUB), 1);
  }
  assert.equal(seasonMinutesFor(21, 44, STARTING_CLUB), seasonMinutesFor(30, 44, STARTING_CLUB));
  for (let tier = 1; tier < 4; tier++) {
    assert(seasonMinutesFor(25, 75, { tier }) > seasonMinutesFor(25, 75, { tier: tier + 1 }));
  }
  assert.equal(seasonMinutesFor(17, 44, STARTING_CLUB), seasonMinutesFor(17, 44, { tier: 3 }));
});

test('minutos enteros limitados en todas las edades, medias y tiers', () => {
  for (let age = 17; age <= 40; age++) for (let rating = 0; rating <= 100; rating++) {
    for (let tier = 1; tier <= 4; tier++) for (const roll of [0, .5, 1]) {
      const minutes = seasonMinutesFor(age, rating, { tier }, roll);
      assert(Number.isInteger(minutes) && minutes >= 0 && minutes <= 38);
    }
  }
});

test('el motor escala estadísticas por minutos, respeta género e historial', () => {
  const initial = createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5);
  const career = { ...initial, attributes: uniformAttributes(44), overall: 44, overallExact: 44,
    development: { ...initial.development, potential: 44 } };
  const rookie = resolveSeason(career, false, () => .5);
  const veteran = resolveSeason({ ...career, age: 25 }, false, () => .5);
  assert.equal(rookie.lastResult.overall, 44);
  assert.equal(rookie.lastResult.minutesPerGame, 2);
  assert(rookie.lastResult.averages.points < 4);
  for (const key of ['points', 'rebounds', 'assists', 'steals', 'blocks']) {
    // Rare actions can round to the same integer total at very low minutes.
    assert(rookie.lastResult.totals[key] <= veteran.lastResult.totals[key]);
  }
  assert(rookie.lastResult.totals.points < veteran.lastResult.totals.points);
  const female = resolveSeason({ ...career, profile: { ...profile, gender: 'femenino' } }, false, () => .5);
  assert.deepEqual(female.lastResult, rookie.lastResult);
  const before = structuredClone(rookie.seasons[0]);
  const next = resolveSeason(advanceCareer(rookie, [], () => .5), false, () => .5);
  assert.deepEqual(next.seasons[0], before);
});

test('una temporada completa de baja no genera minutos ni estadísticas', () => {
  const initial = createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5);
  const result = resolveSeason({ ...initial, pendingEvent: { ...initial.pendingEvent,
    chance: 100, success: { gamesMissed: initial.settings.gamesPerSeason } } }, true, () => .5);
  assert.equal(result.lastResult.games, 0);
  assert.equal(result.lastResult.minutesPerGame, 0);
  assert(Object.values(result.lastResult.totals).every((total) => total === 0));
});

test('cero minutos significa banquillo, sin partidos ni estadísticas ni lesiones inventadas', () => {
  const initial = createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5);
  const career = { ...initial, attributes: uniformAttributes(40), overall: 40, overallExact: 40,
    development: { ...initial.development, potential: 40 } };
  const { lastResult } = resolveSeason(career, false, () => .5);
  assert.equal(lastResult.minutesPerGame, 0);
  assert.equal(lastResult.games, 0);
  assert.equal(lastResult.gamesMissed, 0);
  assert.equal(lastResult.gamesBenched, initial.settings.gamesPerSeason);
  assert.equal(lastResult.role, 'inactive');
  assert.deepEqual(lastResult.individualAwards, []);
  assert(Object.values(lastResult.totals).every((total) => total === 0));
});
