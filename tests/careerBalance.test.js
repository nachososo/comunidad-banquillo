import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceRates, uniformAttributes, overallFromAttributes } from '../src/utils/careerAttributes.js';
import { naturalDevelopment, playingExperienceFactor } from '../src/utils/careerDevelopment.js';
import { createCareer, resolveSeason } from '../src/utils/careerEngine.js';
import { DEFAULT_CAREER_CONFIG, POSITIONS, STARTING_CLUB } from '../src/data/careerData.js';

const seeded = (seed) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const profile = { name: 'Equilibrio', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
const initial = createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5);
const atRating = (rating, position = 'Base', tier = 3) => ({ ...initial, age: 25,
  profile: { ...profile, position }, currentClub: tier === 3 ? STARTING_CLUB : { id: 'test-' + tier, tier },
  attributes: uniformAttributes(rating), overall: rating, overallExact: rating,
  development: { potential: rating, rate: 1, maturation: 'normal' },
});

test('70 equilibrado ronda 4–6 puntos: 4.000 temporadas en posiciones y tiers distintos', () => {
  let sum = 0, count = 0;
  for (const position of POSITIONS) for (const tier of [1, 2, 3, 4]) for (let seed = 1; seed <= 200; seed++) {
    const { lastResult } = resolveSeason(atRating(70, position, tier), false, seeded(seed));
    assert.equal(lastResult.overall, 70);
    assert(lastResult.averages.points >= 3.5 && lastResult.averages.points <= 6.5);
    assert(lastResult.averages.rebounds < 7);
    assert(lastResult.averages.assists < 5);
    assert(lastResult.averages.steals < 1.5);
    assert(lastResult.averages.blocks < 1);
    sum += lastResult.averages.points; count++;
  }
  assert(sum / count >= 4 && sum / count <= 6);
});

test('los niveles altos mantienen acceso a anotación de referencia y premios', () => {
  const means = [50, 60, 70, 80, 90, 95].map((rating) => {
    let sum = 0;
    for (let seed = 1; seed <= 200; seed++) sum += resolveSeason(atRating(rating), false, seeded(seed)).lastResult.averages.points;
    return sum / 200;
  });
  for (let i = 1; i < means.length; i++) assert(means[i] > means[i - 1]);
  assert(means[4] >= 16 && means[4] <= 21);
  assert(means[5] > 20);
});

test('misma media no equivale a misma anotación: mandan las habilidades y la posición', () => {
  const scorer = { ...uniformAttributes(70), shooting: 90, passing: 58.57 };
  const defender = { ...uniformAttributes(70), shooting: 50, passing: 81.43 };
  assert.equal(overallFromAttributes(scorer, 'Base'), 70);
  assert.equal(overallFromAttributes(defender, 'Base'), 70);
  assert(performanceRates(scorer, 'Base').points > performanceRates(defender, 'Base').points * 2);
  const guard = performanceRates(uniformAttributes(70), 'Base');
  const pivot = performanceRates(uniformAttributes(70), 'Pívot');
  assert(pivot.rebounds > guard.rebounds);
  assert(pivot.blocks > guard.blocks);
  assert(guard.assists > pivot.assists);
});

test('todas las curvas son finitas, positivas y progresivas, sin saltos de media', () => {
  for (const position of POSITIONS) for (const roll of [0, .5, 1]) {
    let previous = performanceRates(uniformAttributes(0), position, roll);
    for (let rating = 1; rating <= 100; rating++) {
      const current = performanceRates(uniformAttributes(rating), position, roll);
      for (const key of Object.keys(current)) {
        assert(Number.isFinite(current[key]) && current[key] > previous[key]);
      }
      previous = current;
    }
  }
});

test('la experiencia modera la evolución sin bloquear suplentes ni premiar puntos artificiales', () => {
  const career = { ...initial, development: { potential: 90, rate: 1, maturation: 'normal' } };
  const withMinutes = (minutes, extra = {}) => ({ ...career, seasons: [{ games: 24, scheduled: 24, gamesMissed: 0, minutesPerGame: minutes, ...extra }] });
  assert.equal(playingExperienceFactor(career), 1);
  assert.equal(playingExperienceFactor(withMinutes(0)), .85);
  assert(Math.abs(playingExperienceFactor(withMinutes(12)) - .925) < 1e-12);
  assert.equal(playingExperienceFactor(withMinutes(24)), 1);
  assert.equal(playingExperienceFactor(withMinutes(38)), 1);
  assert.equal(playingExperienceFactor(withMinutes(0, { gamesMissed: 24 })), 1);
  const grow = (c) => naturalDevelopment(c, c.development, 0, () => .5).changeExact;
  assert(grow(withMinutes(0)) > 0);
  assert(grow(withMinutes(0)) < grow(withMinutes(12)));
  assert(grow(withMinutes(12)) < grow(withMinutes(24)));
  assert.equal(grow(withMinutes(12)), grow(withMinutes(12, { averages: { points: 100 } })));
  assert.equal(grow({ ...withMinutes(0), age: 38 }), grow({ ...withMinutes(24), age: 38 }));
});
