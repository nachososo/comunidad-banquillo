import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { WHITE_AIR, STARTING_CLUB, minimumOverallForClub } from '../src/data/careerClubs.js';
import { WHITE_AIR_OFFER, DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, eligibleEvents, resolveSeason } from '../src/utils/careerEngine.js';
import { includeWhiteAir, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

test('White Air: tier 2, mínimo 70, oferta privada y cambio de identidad con logo transparente', async () => {
  assert.equal(WHITE_AIR.tier, 2);
  assert.equal(minimumOverallForClub(WHITE_AIR), 70);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === WHITE_AIR.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === WHITE_AIR_OFFER.id));
  const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
  const career = { ...createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5), age: 25, appearances: {} };
  for (const overall of [0, 40, 69, 70, 100]) {
    assert.equal(eligibleEvents([WHITE_AIR_OFFER], { ...career, overall }).length, overall >= 70 ? 1 : 0);
  }
  const offered = advanceCareer({ ...career, overall: 70, phase: 'result' }, [WHITE_AIR_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de White Air');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, WHITE_AIR);
  assert.equal(signed.lastResult.club.groupName, 'White Air');
  assert.equal(signed.lastResult.club.logo, '/img/white-air.png');
  assert.equal(eligibleEvents([WHITE_AIR_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + WHITE_AIR.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6);
});

test('incorpora White Air una vez sin sobrescribir personalizaciones ni recuperar clubes borrados', () => {
  const old = { version: 2, clubPackVersion: 9, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeWhiteAir(old);
  assert.deepEqual(old, before);
  assert.equal(added.clubPackVersion, 10);
  assert.deepEqual(added.clubs, [STARTING_CLUB, WHITE_AIR]);
  assert.deepEqual(added.events, [WHITE_AIR_OFFER]);
  assert.deepEqual(includeWhiteAir(added), added);
  const custom = { ...WHITE_AIR, id: 'mi-white-air', groupName: 'Grupo personalizado' };
  const offer = { ...newTransferEvent('oferta-white-air-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includeWhiteAir({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]);
  assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});
