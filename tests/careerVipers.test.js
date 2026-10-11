import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { VIPERS, STARTING_CLUB, minimumOverallForClub } from '../src/data/careerClubs.js';
import { VIPERS_OFFER, DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, eligibleEvents, resolveSeason } from '../src/utils/careerEngine.js';
import { includeVipers, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

test('Vipers: tier 1 sin mínimo, oferta desde los 18 e identidad con logo transparente', async () => {
  assert.equal(VIPERS.tier, 1);
  assert.equal(minimumOverallForClub(VIPERS), 0);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === VIPERS.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === VIPERS_OFFER.id));
  const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
  const career = { ...createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5), age: 18, appearances: {} };
  for (const overall of [0, 40, 69, 80, 100]) {
    assert.equal(eligibleEvents([VIPERS_OFFER], { ...career, overall }).length, 1);
  }
  assert.equal(eligibleEvents([VIPERS_OFFER], { ...career, age: 17 }).length, 0);
  const offered = advanceCareer({ ...career, overall: 40, phase: 'result' }, [VIPERS_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de Vipers');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, VIPERS);
  assert.equal(signed.lastResult.club.groupName, 'Vipers');
  assert.equal(signed.lastResult.club.logo, '/img/vipers.png');
  assert.equal(eligibleEvents([VIPERS_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + VIPERS.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6);
});

test('incorpora Vipers una vez sin sobrescribir personalizaciones ni recuperar clubes borrados', () => {
  const old = { version: 2, clubPackVersion: 8, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeVipers(old);
  assert.deepEqual(old, before);
  assert.equal(added.clubPackVersion, 9);
  assert.deepEqual(added.clubs, [STARTING_CLUB, VIPERS]);
  assert.deepEqual(added.events, [VIPERS_OFFER]);
  assert.deepEqual(includeVipers(added), added);
  const custom = { ...VIPERS, id: 'mis-vipers', groupName: 'Grupo personalizado' };
  const offer = { ...newTransferEvent('oferta-vipers-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includeVipers({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]);
  assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});
