import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAGUE_TIERS, leagueTierForClub, leagueChanceForClub, simulateMunicipalLeague } from '../src/utils/careerLeague.js';
import { STARTING_CLUB, minimumOverallForClub, validateClubs } from '../src/data/careerClubs.js';
import { DEFAULT_CAREER_CONFIG, newCareerEvent, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, resolveSeason, validateConfig } from '../src/utils/careerEngine.js';
import { parseCareerCatalog, saveLocalCareerCatalog, readLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

test('rangos por tier crecientes con la media, nunca 0 ni garantía de título', () => {
  assert.deepEqual(Object.values(LEAGUE_TIERS).map(({ base, max }) => [base, max]), [[.1, 1], [2, 8], [10, 25], [25, 50]]);
  for (let overall = 0; overall <= 100; overall++) {
    const probabilities = [1, 2, 3, 4].map((tier) => leagueChanceForClub({ tier }, overall));
    assert(probabilities[0] > 0 && probabilities[3] < 100);
    for (let i = 1; i < 4; i++) assert(probabilities[i] > probabilities[i - 1]);
    if (overall < 100) for (const tier of [1, 2, 3, 4]) assert(leagueChanceForClub({ tier }, overall + 1) > leagueChanceForClub({ tier }, overall));
  }
  assert.equal(leagueChanceForClub({ tier: 1 }, -100), .1);
  assert.equal(leagueChanceForClub({ tier: 4 }, 200), 50);
});

test('el Banquillo siempre usa tier 3 de liga, también con catálogo antiguo, sin endurecer sus fichajes', () => {
  for (const club of [STARTING_CLUB, { id: 'cdb' }, { ...STARTING_CLUB, tier: 1 }]) {
    assert.equal(leagueTierForClub(club), 3);
    assert.equal(leagueChanceForClub(club, 40), 16);
    assert.equal(leagueChanceForClub(club, 80), 22);
    assert.equal(minimumOverallForClub(club), 0);
  }
  for (const club of DEFAULT_CAREER_CONFIG.clubs) assert(leagueChanceForClub(club, 0) > 0);
});

test('porcentajes propios validados y conservados al guardar/exportar/importar sin mutaciones', () => {
  const custom = { ...STARTING_CLUB, leagueBaseChance: .5, leagueMaxChance: 4 };
  assert.equal(leagueChanceForClub(custom, 50), 2.25);
  assert.deepEqual(validateClubs([custom]), []);
  assert.equal(leagueChanceForClub({ ...custom, leagueBaseChance: null, leagueMaxChance: null }, 50), 17.5);
  for (const bad of [0, -1, 100, Infinity, NaN, '3', false]) {
    for (const key of ['leagueBaseChance', 'leagueMaxChance']) assert(validateClubs([{ ...custom, [key]: bad }]).length);
  }
  assert(validateClubs([{ ...custom, leagueMaxChance: .5 }]).length);
  assert(validateClubs([{ ...custom, leagueBaseChance: 5 }]).length);
  const config = { ...structuredClone(DEFAULT_CAREER_CONFIG), clubs: [custom], events: [] };
  const before = structuredClone(config);
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(config, storage);
  assert.deepEqual(config, before);
  assert.deepEqual(readLocalCareerCatalog(storage), config);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(config)), config);
  assert.deepEqual(validateConfig(DEFAULT_CAREER_CONFIG), []);
});

test('frecuencias de campeón corresponden al porcentaje y no al umbral de victorias', () => {
  for (const tier of [1, 2, 3, 4]) for (const overall of [40, 80, 100]) {
    let titles = 0;
    const count = 10000;
    for (let i = 0; i < count; i++) {
      let first = true;
      const result = simulateMunicipalLeague({ tier }, overall, 24, 50, 1, () => {
        if (first) { first = false; return (i + .5) / count; }
        return .5;
      });
      titles += Number(result.leagueChampion);
      assert.equal(result.wins + result.losses, 24);
      assert(result.wins >= 1 && result.wins <= 24);
      if (result.leagueChampion) assert(result.wins >= 18);
    }
    assert(Math.abs(titles / count * 100 - leagueChanceForClub({ tier }, overall)) < .011);
  }
  let first = true;
  const runnerUp = simulateMunicipalLeague({ tier: 4 }, 100, 24, 50, 0, () => first ? (first = false, .99) : 0);
  assert.equal(runnerUp.wins, 23);
  assert.equal(runnerUp.leagueChampion, false);
  assert.equal(simulateMunicipalLeague({ tier: 1 }, 0, 24, 50, 0, () => 0).leagueChampion, true);
  assert.equal(simulateMunicipalLeague({ tier: 4 }, 100, 24, 50, 0, () => .99).leagueChampion, false);
});

const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
test('un fichaje calcula la liga con destino y media final, sin reescribir temporadas anteriores', () => {
  const club = { ...STARTING_CLUB, id: 'nuevo', name: 'Nuevo', tier: 4, minOverall: 0 };
  const offer = newTransferEvent('offer', club.id);
  const config = { ...structuredClone(DEFAULT_CAREER_CONFIG), clubs: [STARTING_CLUB, club], events: [offer] };
  let career = createCareer(profile, config, () => .5);
  career = resolveSeason(career, false, () => .5);
  const oldYear = structuredClone(career.lastResult);
  const pending = advanceCareer(career, config.events, () => .5);
  const signed = resolveSeason(pending, true, () => 0);
  assert.equal(signed.lastResult.leagueTier, 4);
  assert.equal(signed.lastResult.leagueChance, leagueChanceForClub(club, signed.lastResult.overall));
  assert.deepEqual(signed.lastResult.collectiveAwards, ['Campeonato de liga municipal', 'Copa Interdistritos']);
  assert.deepEqual(signed.seasons[0], oldYear);
  const rejected = resolveSeason(pending, false, () => .5);
  assert.equal(rejected.lastResult.leagueTier, 3);
  const failed = resolveSeason({ ...pending, pendingEvent: { ...pending.pendingEvent, chance: 0 } }, true, () => .5);
  assert.equal(failed.lastResult.leagueTier, 3);
});

test('retirada no sortea liga; las bajas no borran la temporada del equipo ni conceden premios individuales', () => {
  const initial = createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5);
  const retired = resolveSeason({ ...initial, age: 30, pendingEvent: { ...newCareerEvent('retire'), category: 'retirement', chance: 100 } }, true, () => 0);
  assert.equal(retired.lastResult.leagueChance, null);
  assert.equal(retired.lastResult.leagueChampion, false);
  assert.deepEqual(retired.lastResult.collectiveAwards, []);
  const absent = resolveSeason({ ...initial, pendingEvent: { ...newCareerEvent('absence'), chance: 100, success: { gamesMissed: 40 } } }, true, () => 0);
  assert.equal(absent.lastResult.games, 0);
  assert.equal(absent.lastResult.wins + absent.lastResult.losses, initial.settings.gamesPerSeason);
  assert.deepEqual(absent.lastResult.individualAwards, []);
  assert.deepEqual(absent.lastResult.collectiveAwards, ['Campeonato de liga municipal', 'Copa Interdistritos']);
});
