import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PANZER, STARTING_CLUB, minimumOverallForClub } from '../src/data/careerClubs.js';
import { PANZER_OFFER, DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, eligibleEvents, resolveSeason } from '../src/utils/careerEngine.js';
import { includePanzer, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

test('Panzer: tier 3, mínimo 80, oferta privada y cambio de identidad con logo transparente', async () => {
  assert.equal(PANZER.tier, 3);
  assert.equal(minimumOverallForClub(PANZER), 80);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === PANZER.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === PANZER_OFFER.id));
  const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
  const career = { ...createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5), age: 25, appearances: {} };
  for (const overall of [0, 70, 79, 80, 100]) {
    assert.equal(eligibleEvents([PANZER_OFFER], { ...career, overall }).length, overall >= 80 ? 1 : 0);
  }
  const offered = advanceCareer({ ...career, overall: 80, phase: 'result' }, [PANZER_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de Panzer');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, PANZER);
  assert.equal(signed.lastResult.club.groupName, 'Panzer');
  assert.equal(signed.lastResult.club.logo, '/img/panzer.png');
  assert.equal(eligibleEvents([PANZER_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + PANZER.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6);
});

test('incorpora Panzer una vez sin sobrescribir personalizaciones ni recuperar clubes borrados', () => {
  const old = { version: 2, clubPackVersion: 7, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includePanzer(old);
  assert.deepEqual(old, before);
  assert.equal(added.clubPackVersion, 8);
  assert.deepEqual(added.clubs, [STARTING_CLUB, PANZER]);
  assert.deepEqual(added.events, [PANZER_OFFER]);
  assert.deepEqual(includePanzer(added), added);
  const custom = { ...PANZER, id: 'mi-panzer', groupName: 'Grupo personalizado' };
  const offer = { ...newTransferEvent('oferta-panzer-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includePanzer({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]);
  assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});
