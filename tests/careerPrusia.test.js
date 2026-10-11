import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRUSIA, STARTING_CLUB, minimumOverallForClub } from '../src/data/careerClubs.js';
import { PRUSIA_OFFER, DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, eligibleEvents, resolveSeason } from '../src/utils/careerEngine.js';
import { includePrusia, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

test('Prusia: tier 3, mínimo 80, oferta privada e identidad con logo horizontal transparente', async () => {
  assert.equal(PRUSIA.tier, 3);
  assert.equal(minimumOverallForClub(PRUSIA), 80);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === PRUSIA.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === PRUSIA_OFFER.id));
  const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
  const career = { ...createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5), age: 25, appearances: {} };
  for (const overall of [0, 70, 79, 80, 100]) {
    assert.equal(eligibleEvents([PRUSIA_OFFER], { ...career, overall }).length, overall >= 80 ? 1 : 0);
  }
  const offered = advanceCareer({ ...career, overall: 80, phase: 'result' }, [PRUSIA_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de Prusia');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, PRUSIA);
  assert.equal(signed.lastResult.club.groupName, 'Prusia');
  assert.equal(signed.lastResult.club.logo, '/img/prusia.png');
  assert.equal(eligibleEvents([PRUSIA_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + PRUSIA.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6);
  assert(png.readUInt32BE(16) > png.readUInt32BE(20));
});

test('incorpora Prusia una vez sin sobrescribir personalizaciones ni recuperar clubes borrados', () => {
  const old = { version: 2, clubPackVersion: 6, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includePrusia(old);
  assert.deepEqual(old, before);
  assert.equal(added.clubPackVersion, 7);
  assert.deepEqual(added.clubs, [STARTING_CLUB, PRUSIA]);
  assert.deepEqual(added.events, [PRUSIA_OFFER]);
  assert.deepEqual(includePrusia(added), added);
  const custom = { ...PRUSIA, id: 'mi-prusia', groupName: 'Grupo personalizado' };
  const offer = { ...newTransferEvent('oferta-prusia-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includePrusia({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]);
  assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});
