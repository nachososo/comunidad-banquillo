import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CAREER_CONFIG as CONFIG, DEFAULT_CAREER_EVENTS as EVENTS, ROUTINE_EVENT, STARTING_CLUB, START_AGE, MAX_SEASONS } from '../src/data/careerData.js';
import { advanceCareer, careerSummary, categoryForAge, chanceFor, createCareer, eligibleEvents, resolveSeason, selectEvent, upgradeConfig, validateConfig } from '../src/utils/careerEngine.js';
import { uniformAttributes } from '../src/utils/careerAttributes.js';

const profile = { name: 'Prueba', number: 7, team: 'femenino', position: 'Base', archetype: 'allround' };
const initial = (config = CONFIG) => createCareer(profile, config, () => 0);
const event = () => structuredClone(EVENTS[0]);
const seeded = (seed = 23) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pending = (e, extra = {}) => ({ ...initial(), ...extra, overallExact: extra.overallExact ?? extra.overall ?? 40, attributes: extra.attributes ?? uniformAttributes(extra.overallExact ?? extra.overall ?? 40), phase: 'event', pendingEvent: e });

test('catálogo anual válido, IDs únicos y eventos de lesión y retirada', () => {
  assert.deepEqual(validateConfig(CONFIG), []);
  assert.equal(new Set(EVENTS.map((e) => e.id)).size, EVENTS.length);
  assert(EVENTS.some((e) => e.category === 'injury'));
  assert(EVENTS.some((e) => e.category === 'retirement'));
});
test('categorías exactas: 13–14, 15–16, 17–18 y senior desde 19', () => {
  for (const [age, category] of [[13, 'infantil'], [14, 'infantil'], [15, 'cadete'], [16, 'cadete'], [17, 'junior'], [18, 'junior'], [19, 'senior'], [40, 'senior']]) assert.equal(categoryForAge(age), category);
});
test('comienza a los 17 con un solo evento y no muta el perfil ni el catálogo', () => {
  const snapshot = structuredClone(CONFIG), c = initial();
  assert.equal(c.age, 17); assert.equal(c.phase, 'event'); assert.equal(c.seasons.length, 0);
  assert.equal(START_AGE, 17); assert.equal(MAX_SEASONS, 24);
  assert.deepEqual(c.currentClub, STARTING_CLUB);
  c.pendingEvent.title = 'Cambio local';
  assert.deepEqual(CONFIG, snapshot);
  assert.throws(() => createCareer({ ...profile, name: ' ' }));
  assert.throws(() => createCareer({ ...profile, number: 100 }));
});
test('0% nunca y 100% siempre, incluso con influencia', () => {
  for (const chance of [0, 100]) for (const overall of [0, 50, 100]) {
    const e = { ...event(), chance, influence: 30 };
    assert.equal(chanceFor(e, overall), chance);
    assert.equal(resolveSeason(pending(e, { overall }), true, () => chance ? .999999 : 0).lastResult.event.success, chance === 100);
  }
});
test('probabilidad fija exacta y ajuste por media', () => {
  const e = { ...event(), chance: 60, influence: 20 };
  assert.equal(chanceFor(e, 0), 40); assert.equal(chanceFor(e, 50), 60); assert.equal(chanceFor(e, 100), 80);
  e.influence = 0;
  assert(resolveSeason(pending(e), true, () => .5999).lastResult.event.success);
  assert(!resolveSeason(pending(e), true, () => .6).lastResult.event.success);
});
test('10.000 sorteos se aproximan al 70% configurado', () => {
  const rng = seeded(), c = pending({ ...event(), chance: 70 });
  let successes = 0;
  for (let n = 0; n < 10000; n++) successes += Number(resolveSeason(c, true, rng).lastResult.event.success);
  assert(Math.abs(successes / 10000 - .7) < .02);
});
test('rechazar no aplica éxito, fallo, lesiones ni premios', () => {
  const e = { ...event(), chance: 100, success: { overall: 20, injuries: 5, gamesMissed: 24 }, successAward: 'Premio del evento' };
  const c = resolveSeason(pending(e), false, () => .5), year = c.lastResult;
  assert.equal(year.event.success, null); assert.equal(year.event.accepted, false);
  assert.equal(year.eventOverallChange, 0); assert.equal(c.injuries, 0); assert.equal(year.games, 24);
  assert(!year.individualAwards.includes('Premio del evento'));
});
test('evento +3 o −2 modifica exactamente la media sobre la evolución normal', () => {
  const e = { ...event(), chance: 100, success: { overall: 3 }, failure: { overall: -2 } };
  const good = resolveSeason(pending(e), true, () => .5);
  const bad = resolveSeason(pending({ ...e, chance: 0 }), true, () => .5);
  assert.equal(good.lastResult.eventOverallChange, 3); assert.equal(bad.lastResult.eventOverallChange, -2);
  assert.equal(good.overall - bad.overall, 5);
});
test('canasta ganadora incrementa estadísticas y corresponde a una victoria', () => {
  const baseline = resolveSeason(pending({ ...event(), chance: 100, success: {} }), true, () => .99).lastResult;
  const winner = resolveSeason(pending({ ...event(), chance: 100, success: { points: 3, winningShots: 1 } }), true, () => .99).lastResult;
  assert.equal(winner.totals.points, baseline.totals.points + 3);
  assert.equal(winner.winningShots, 1); assert(winner.wins >= 1);
});
test('lesiones se acumulan y limitan partidos; temporada en blanco no genera estadísticas', () => {
  const e = { ...event(), chance: 100, success: { injuries: 1, gamesMissed: 40, points: 100 } };
  const c = resolveSeason(pending(e), true, () => 0);
  assert.equal(c.injuries, 1); assert.equal(c.lastResult.games, 0);
  assert(Object.values(c.lastResult.totals).every((value) => value === 0));
  assert.equal(c.lastResult.individualAwards.length, 0);
});
test('filtros por edad, categoría, posición y lesiones, nunca por género', () => {
  const c = { ...initial(), appearances: {} };
  for (const changes of [{ minAge: 18 }, { maxAge: 16 }, { stage: 'cadete' }, { stage: 'infantil' }, { position: 'Pívot' }, { minInjuries: 1 }]) assert.equal(eligibleEvents([{ ...event(), ...changes }], c).length, 0);
  for (const team of ['all', 'masculino', 'femenino']) assert.equal(eligibleEvents([{ ...event(), team }], c).length, 1);
  assert.equal(eligibleEvents([{ ...event(), stage: 'junior' }], c).length, 1);
});
test('peso relativo, descanso en años y máximos por carrera', () => {
  const a = { ...event(), id: 'a', weight: 10 }, b = { ...event(), id: 'b', weight: 20 };
  assert.equal(selectEvent([a, b], initial(), () => .2).id, 'a');
  assert.equal(selectEvent([a, b], initial(), () => .5).id, 'b');
  const c = { ...initial(), age: 20, appearances: { a: { count: 1, age: 17 } } };
  assert.equal(eligibleEvents([a], c).length, 0);
  assert.equal(eligibleEvents([a], { ...c, age: 21 }).length, 1);
  assert.equal(eligibleEvents([a], { ...c, age: 25, appearances: { a: { count: 2, age: 17 } } }).length, 0);
});
test('catálogo vacío o pausado usa evento básico, no eventos eliminados', () => {
  assert.equal(selectEvent([], initial()).id, ROUTINE_EVENT.id);
  assert.equal(selectEvent([{ ...event(), enabled: false }], initial()).id, ROUTINE_EVENT.id);
});
test('la retirada nunca aparece antes de 30 y respeta lesiones previas', () => {
  const retire = EVENTS.find((e) => e.id === 'retire-injuries');
  for (let age = 13; age < 30; age++) assert.equal(eligibleEvents([{ ...retire, minAge: 13 }], { ...initial(), age, injuries: 10 }).length, 0);
  assert.equal(eligibleEvents([retire], { ...initial(), age: 30, injuries: 0 }).length, 0);
  assert.equal(eligibleEvents([retire], { ...initial(), age: 30, injuries: 1 }).length, 1);
});
test('aceptar retirada desde 30 cierra la carrera, rechazarla permite seguir', () => {
  const e = EVENTS.find((item) => item.id === 'retire-injuries');
  const c = pending(e, { age: 30, injuries: 2 });
  const retired = resolveSeason(c, true, () => .99);
  assert.equal(retired.phase, 'retired'); assert.equal(retired.retirementAge, 30);
  assert.equal(retired.lastResult.games, 0); assert.equal(retired.overall, c.overall);
  assert.equal(retired.lastResult.individualAwards.length, 0);
  const continued = advanceCareer(resolveSeason(c, false, () => .5), EVENTS, () => 0);
  assert.equal(continued.age, 31); assert.equal(continued.phase, 'event');
  assert.equal(resolveSeason(pending(e, { age: 29, injuries: 3 }), true, () => 0).phase, 'result');
});
test('no se puede resolver ni avanzar dos veces una temporada', () => {
  const c = resolveSeason(initial(), false);
  assert.throws(() => resolveSeason(c, true));
  assert.throws(() => advanceCareer(initial(), EVENTS));
  const next = advanceCareer(c, EVENTS);
  assert.throws(() => advanceCareer(next, EVENTS));
});
test('100 carreras desde 17 hasta 40: 24 eventos, sin duplicados, categorías correctas', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const rng = seeded(seed); let c = createCareer(profile, CONFIG, rng), steps = 0;
    while (c.phase !== 'retired' && steps++ < 60) {
      c = c.phase === 'event' ? resolveSeason(c, c.pendingEvent.category !== 'retirement' && rng() < .6, rng) : advanceCareer(c, EVENTS, rng);
    }
    assert.equal(c.phase, 'retired'); assert.equal(c.retirementAge, 40);
    assert.equal(c.seasons.length, 24); assert.equal(new Set(c.seasons.map((year) => year.age)).size, 24);
    assert.equal(c.seasons[0].age, 17); assert.equal(c.seasons[0].season, 1);
    assert.equal(c.seasons.at(-1).age, 40); assert.equal(c.seasons.at(-1).season, 24);
    assert(c.seasons.every((year) => year.category === 'junior' || year.category === 'senior'));
    assert.equal(c.peakOverall, Math.max(40, ...c.seasons.map((year) => year.overall)));
    for (const year of c.seasons) { assert.equal(year.category, categoryForAge(year.age)); assert(year.overall >= 0 && year.overall <= 100); }
  }
});
test('el resumen pondera estadísticas por partidos y conserva las etapas de club', () => {
  let c = resolveSeason(initial(), false, () => 0);
  c = advanceCareer(c, EVENTS, () => 0);
  c = { ...c, currentClub: { id: 'future', name: 'Club de prueba futuro' } };
  c = resolveSeason(c, false, () => .5);
  const summary = careerSummary(c);
  assert.equal(summary.clubs.length, 2); assert.equal(summary.clubs[0].name, STARTING_CLUB.name);
  assert.equal(c.seasons[0].club.id, 'cdb'); assert.equal(c.seasons[1].club.id, 'future');
  assert.equal(summary.games, c.seasons.reduce((sum, year) => sum + year.games, 0));
  assert.equal(summary.averages.points, Math.round(summary.totals.points / summary.games * 10) / 10);
});
test('premios individuales y colectivos se agregan con año y club', () => {
  const e = { ...event(), chance: 100, success: {}, successAward: 'Premio especial' };
  const c = resolveSeason(pending(e, { age: 25, overall: 90 }), true, () => 0);
  const summary = careerSummary(c);
  assert(summary.individualAwards.some((award) => award.title === 'Premio especial' && award.age === 25));
  assert(summary.collectiveAwards.some((award) => award.title.includes('Campeonato')));
});
test('validación de edición rechaza límites, edades imposibles, probabilidad vacía y efectos inválidos', () => {
  for (const modify of [
    (c) => { c.events[0].chance = 101; }, (c) => { c.events[0].chance = ''; },
    (c) => { c.events[0].minAge = 40; c.events[0].maxAge = 13; },
    (c) => { c.events[0].success.overall = 31; },
    (c) => { c.events[0].category = 'retirement'; },
    (c) => { c.events.push(c.events[0]); },
  ]) { const c = structuredClone(CONFIG); modify(c); assert(validateConfig(c).length > 0); }
  assert.deepEqual(validateConfig({ ...CONFIG, events: [] }), []);
});
test('adapta catálogo antiguo sin modificarlo ni resucitar eventos eliminados', () => {
  const old = { version: 1, settings: { difficulty: 60 }, events: [{ id: 'old', title: 'Anterior', description: 'Evento anterior', enabled: false, weight: 10, team: 'all', position: 'all', category: 'court', choices: [{ label: 'Probar', chance: 40, successText: 'Bien', failureText: 'Mal', success: { shooting: 12 }, failure: { defense: -8 } }] }] };
  const snapshot = structuredClone(old), converted = upgradeConfig(old);
  assert.deepEqual(old, snapshot); assert.deepEqual(validateConfig(converted), []);
  assert.equal(converted.events[0].success.overall, 3); assert.equal(converted.events[0].failure.overall, -2);
  assert.equal(converted.events[0].enabled, false);
  assert.equal(upgradeConfig({ ...old, events: [] }).events.length, 0);
});
