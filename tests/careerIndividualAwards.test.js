import test from 'node:test';
import assert from 'node:assert/strict';
import { additionalIndividualAwards, isMvpSeason, seasonRoleFor } from '../src/utils/careerIndividualAwards.js';
import { createCareer, resolveSeason, careerSummary } from '../src/utils/careerEngine.js';
import { uniformAttributes } from '../src/utils/careerAttributes.js';
import { DEFAULT_CAREER_CONFIG } from '../src/data/careerData.js';

const stats = { games: 24, scheduled: 24, role: 'sixth', averages: { points: 14, rebounds: 9, assists: 4, steals: 1.5, blocks: .5 } };
const attributes = uniformAttributes(80);

test('papel anual distingue suplente de titular y ausencia sin cambiar los minutos', () => {
  assert.equal(seasonRoleFor(0, 0), 'inactive');
  assert.equal(seasonRoleFor(24, 19), 'rotation');
  assert.equal(seasonRoleFor(24, 20), 'sixth');
  assert.equal(seasonRoleFor(24, 27), 'sixth');
  assert.equal(seasonRoleFor(24, 28), 'starter');
});

test('el MVP exige impacto estadístico, protagonismo y un balance ganador', () => {
  const season = (changes = {}) => ({
    games: 24, scheduled: 24, minutesPerGame: 34, wins: 18, losses: 6,
    averages: { points: 16, rebounds: 6, assists: 7, steals: 1.8, blocks: .5 },
    ...changes,
  });
  assert.equal(isMvpSeason(season(), 90), true);
  assert.equal(isMvpSeason(season({ minutesPerGame: 29, averages: { points: 6.3, rebounds: 2.5, assists: 4.5, steals: 1.1, blocks: .3 } }), 75), false);
  assert.equal(isMvpSeason(season({ averages: { points: 6.3, rebounds: 2.5, assists: 4.5, steals: 1.1, blocks: .3 } }), 95), false);
  assert.equal(isMvpSeason(season({ wins: 14, losses: 10 }), 90), false);
  assert.equal(isMvpSeason(season({ games: 17 }), 90), false);
  assert.equal(isMvpSeason(season({ minutesPerGame: 27 }), 90), false);
});

test('nuevos premios usan rebotes, defensa y banquillo, con al menos media temporada', () => {
  const awards = (changes = {}, overall = 80, skill = attributes, rng = () => 0) => additionalIndividualAwards({ ...stats, ...changes }, overall, skill, rng);
  assert.deepEqual(awards(), ['Máximo reboteador', 'Mejor defensor', 'Sexto hombre']);
  assert.deepEqual(awards({ games: 0 }), []);
  assert.deepEqual(awards({ games: 11 }), []);
  assert.equal(awards({ games: 12 }).length, 3);
  assert(!awards({ averages: { ...stats.averages, rebounds: 7.9 } }).includes('Máximo reboteador'));
  assert(awards({ averages: { ...stats.averages, rebounds: 8 } }).includes('Máximo reboteador'));
  assert(!awards({}, 80, { ...attributes, defense: 74.9 }).includes('Mejor defensor'));
  assert(!awards({ averages: { ...stats.averages, steals: 1.4 } }).includes('Mejor defensor'));
  assert(!awards({ role: 'starter' }).includes('Sexto hombre'));
  assert(!awards({ role: 'rotation' }).includes('Sexto hombre'));
  assert(!awards({}, 59).includes('Sexto hombre'));
  assert(!awards({ averages: { ...stats.averages, points: 9.9 } }).includes('Sexto hombre'));
  assert.deepEqual(awards({}, 80, attributes, () => .4), []);
  assert.deepEqual(awards({}, 80, attributes, () => .35), ['Máximo reboteador']);
  assert.deepEqual(awards({}, 80, attributes, () => .3), ['Máximo reboteador', 'Mejor defensor']);
});

test('frecuencias 40/35/30 y función sin mutaciones ni sorteos de premios no elegibles', () => {
  const before = structuredClone({ stats, attributes });
  const counts = {};
  for (let i = 0; i < 10000; i++) for (const award of additionalIndividualAwards(stats, 80, attributes, () => (i + .5) / 10000)) counts[award] = (counts[award] || 0) + 1;
  assert.deepEqual(counts, { 'Máximo reboteador': 4000, 'Mejor defensor': 3500, 'Sexto hombre': 3000 });
  assert.deepEqual({ stats, attributes }, before);
  assert.deepEqual(additionalIndividualAwards({ ...stats, role: 'starter', averages: { ...stats.averages, rebounds: 1, steals: 0, blocks: 0 } }, 40, uniformAttributes(40), () => { throw new Error('No sortear'); }), []);
});

test('la carrera concede y agrega nuevos premios reales con club y año, no solo dibujos de muestra', () => {
  const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Pívot', archetype: 'allround' };
  const initial = createCareer(profile, { ...structuredClone(DEFAULT_CAREER_CONFIG), events: [] }, () => .5);
  const elite = resolveSeason({ ...initial, age: 25, attributes: uniformAttributes(95), overall: 95, overallExact: 95 }, false, () => .1);
  assert(elite.lastResult.individualAwards.includes('Máximo reboteador · Senior'));
  assert(elite.lastResult.individualAwards.includes('Mejor defensor · Senior'));
  assert(!elite.lastResult.individualAwards.includes('Sexto hombre · Senior'));
  // A productive bench scorer needs real shooting ability, not just overall 65.
  const bench = resolveSeason({ ...initial, age: 25, attributes: { ...uniformAttributes(65), shooting: 93 } }, false, () => .1);
  assert.equal(bench.lastResult.role, 'sixth');
  assert(bench.lastResult.individualAwards.includes('Sexto hombre · Senior'));
  const award = careerSummary(bench).individualAwards.find((item) => item.title.startsWith('Sexto hombre'));
  assert.equal(award.age, 25);
  assert.equal(award.club, initial.currentClub.name);
});
