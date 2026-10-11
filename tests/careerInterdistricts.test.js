import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INTERDISTRICTS_SETTINGS, interdistrictsChanceFor, simulateInterdistricts } from '../src/utils/careerInterdistricts.js';
import { DEFAULT_CAREER_CONFIG, newCareerEvent } from '../src/data/careerData.js';
import { createCareer, resolveSeason, advanceCareer, careerSummary, validateConfig } from '../src/utils/careerEngine.js';
import { parseCareerCatalog, catalogForExport } from '../src/lib/careerLocalCatalog.js';
import { buildCareerShareText } from '../src/utils/careerShare.js';

const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
const makeCareer = () => createCareer(profile, { ...structuredClone(DEFAULT_CAREER_CONFIG), events: [] }, () => .5);

test('Copa: probabilidad baja y creciente 1–12%, acotada y con porcentaje condicional exacto', () => {
  assert.equal(interdistrictsChanceFor(0), 1);
  assert.equal(interdistrictsChanceFor(40), 5.4);
  assert.equal(interdistrictsChanceFor(70), 8.7);
  assert.equal(interdistrictsChanceFor(100), 12);
  assert.equal(interdistrictsChanceFor(-50), 1);
  assert.equal(interdistrictsChanceFor(150), 12);
  for (let rating = 0; rating < 100; rating++) assert(interdistrictsChanceFor(rating + 1) > interdistrictsChanceFor(rating));
  for (const overall of [0, 40, 70, 87, 100]) {
    let champions = 0;
    for (let i = 0; i < 10000; i++) champions += Number(simulateInterdistricts(true, overall, {}, () => (i + .5) / 10000).interdistrictsChampion);
    assert(Math.abs(champions / 100 - interdistrictsChanceFor(overall)) < .011);
  }
});

test('solo campeones de liga sortean la Copa una vez, sin consumir azar si no se clasifican', () => {
  const unavailable = simulateInterdistricts(false, 100, {}, () => { throw new Error('No sortear'); });
  assert.deepEqual(unavailable, { interdistrictsQualified: false, interdistrictsChance: null, interdistrictsChampion: false });
  let calls = 0;
  assert.equal(simulateInterdistricts(true, 100, {}, () => { calls++; return .119999; }).interdistrictsChampion, true);
  assert.equal(calls, 1);
  assert.equal(simulateInterdistricts(true, 100, {}, () => .12).interdistrictsChampion, false);
  assert.equal(simulateInterdistricts(true, 0, {}, () => 0).interdistrictsChampion, true);
  assert.equal(simulateInterdistricts(true, 100, {}, () => 1).interdistrictsChampion, false);
});

test('configuración de Copa valida límites, mantiene catálogos antiguos y exporta ajustes sin mutar', () => {
  const legacy = structuredClone(DEFAULT_CAREER_CONFIG);
  for (const key of Object.keys(DEFAULT_INTERDISTRICTS_SETTINGS)) delete legacy.settings[key];
  assert.deepEqual(validateConfig(legacy), []);
  const career = createCareer(profile, legacy, () => .5);
  assert.equal(career.settings.interdistrictsBaseChance, 1);
  assert.equal(career.settings.interdistrictsMaxChance, 12);
  assert.equal(legacy.settings.interdistrictsBaseChance, undefined);
  for (const bad of ['', '5', false, -1, 0, 25.01, NaN, Infinity]) {
    for (const key of Object.keys(DEFAULT_INTERDISTRICTS_SETTINGS)) assert(validateConfig({ ...legacy, settings: { ...legacy.settings, [key]: bad } }).some((error) => error.includes('Copa Interdistritos')));
  }
  for (const pair of [[2, 2], [12, 1]]) assert(validateConfig({ ...legacy, settings: { ...legacy.settings, interdistrictsBaseChance: pair[0], interdistrictsMaxChance: pair[1] } }).length);
  const custom = { ...legacy, settings: { ...legacy.settings, interdistrictsBaseChance: .5, interdistrictsMaxChance: 8 } };
  const before = structuredClone(custom);
  assert.deepEqual(validateConfig(custom), []);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(catalogForExport(custom))), custom);
  assert.deepEqual(custom, before);
  const session = createCareer(profile, custom, () => .5);
  custom.settings.interdistrictsMaxChance = 20;
  assert.equal(session.settings.interdistrictsMaxChance, 8);
});

test('ganar la Copa suma el doblete al club y año correctos, sin otra temporada ni doble resolución', () => {
  const initial = makeCareer();
  const before = structuredClone(initial);
  const won = resolveSeason(initial, false, () => 0);
  assert.deepEqual(initial, before);
  assert.equal(won.age, 17);
  assert.equal(won.seasons.length, 1);
  assert.equal(won.phase, 'result');
  assert.equal(won.lastResult.interdistrictsQualified, true);
  assert.equal(won.lastResult.interdistrictsChampion, true);
  assert.equal(won.lastResult.interdistrictsChance, interdistrictsChanceFor(won.overall, won.settings));
  assert.equal(won.lastResult.scheduled, initial.settings.gamesPerSeason);
  assert.deepEqual(won.lastResult.collectiveAwards, ['Campeonato de liga municipal', 'Copa Interdistritos']);
  const honours = careerSummary(won).collectiveAwards;
  assert.equal(honours[1].age, 17);
  assert.equal(honours[1].club, initial.currentClub.name);
  assert.throws(() => resolveSeason(won, false), /ya está resuelta/);
  const next = advanceCareer(won, [], () => .5);
  assert.equal(next.age, 18);
  const lost = resolveSeason(next, false, () => .99);
  assert.equal(lost.lastResult.interdistrictsQualified, false);
  assert.deepEqual(lost.seasons[0], won.seasons[0]);
  assert.equal(careerSummary(lost).collectiveAwards.filter((award) => award.title === 'Copa Interdistritos').length, 1);
  assert.match(buildCareerShareText({ ...lost, retirementAge: 18 }, true), /Copa Interdistritos: ¡doblete!/);
});

test('participar sin ganar no concede copa, pero conserva la liga y se cuenta en el historial compartido', () => {
  const initial = makeCareer();
  initial.settings = { ...initial.settings, interdistrictsBaseChance: .01, interdistrictsMaxChance: .02 };
  const result = resolveSeason(initial, false, () => .05);
  assert.equal(result.lastResult.leagueChampion, true);
  assert.equal(result.lastResult.interdistrictsQualified, true);
  assert.equal(result.lastResult.interdistrictsChampion, false);
  assert.deepEqual(result.lastResult.collectiveAwards, ['Campeonato de liga municipal']);
  assert.match(buildCareerShareText({ ...result, retirementAge: 17 }, true), /esta vez no levantamos la copa/);
});

test('retirada no participa; baja completa conserva éxitos del equipo, pero no premios individuales', () => {
  const initial = makeCareer();
  const retired = resolveSeason({ ...initial, age: 30, pendingEvent: { ...newCareerEvent('retire'), category: 'retirement', chance: 100 } }, true, () => 0);
  assert.equal(retired.lastResult.interdistrictsQualified, false);
  assert.equal(retired.lastResult.interdistrictsChance, null);
  assert.equal(retired.lastResult.interdistrictsChampion, false);
  assert.deepEqual(retired.lastResult.collectiveAwards, []);
  const absent = resolveSeason({ ...initial, pendingEvent: { ...newCareerEvent('absent'), chance: 100, success: { gamesMissed: 40 } } }, true, () => 0);
  assert.equal(absent.lastResult.interdistrictsChampion, true);
  assert.equal(absent.lastResult.role, 'inactive');
  assert.deepEqual(absent.lastResult.individualAwards, []);
});
