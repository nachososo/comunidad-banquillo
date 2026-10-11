import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DOS_METROS_DIEZ as club, STARTING_CLUB, minimumOverallForClub } from '../src/data/careerClubs.js';
import { DOS_METROS_DIEZ_OFFER as offer, DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, eligibleEvents, resolveSeason } from '../src/utils/careerEngine.js';
import { includeDosMetrosDiez, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

test('2metros10: tier 3, mínimo 80, oferta privada y cambio de identidad con logo transparente', async () => {
  assert.equal(club.tier, 3);
  assert.equal(minimumOverallForClub(club), 80);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((item) => item.id === club.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((item) => item.id === offer.id));
  const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
  const career = { ...createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5), age: 25, appearances: {} };
  for (const overall of [0, 70, 79, 80, 100]) {
    assert.equal(eligibleEvents([offer], { ...career, overall }).length, overall >= 80 ? 1 : 0);
  }
  assert.equal(eligibleEvents([offer], { ...career, age: 17, overall: 100 }).length, 0);
  const offered = advanceCareer({ ...career, overall: 80, phase: 'result' }, [offer], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de 2metros10');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, club);
  assert.equal(signed.lastResult.club.groupName, '2metros10');
  assert.equal(signed.lastResult.club.logo, '/img/2metros10.png');
  assert.equal(eligibleEvents([offer], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + club.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6);
});

test('incorpora 2metros10 una vez y respeta personalizaciones, pausas y borrados', () => {
  const old = { version: 2, clubPackVersion: 11, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeDosMetrosDiez(old);
  assert.deepEqual(old, before);
  assert.equal(added.clubPackVersion, 12);
  assert.deepEqual(added.clubs, [STARTING_CLUB, club]);
  assert.deepEqual(added.events, [offer]);
  assert.deepEqual(includeDosMetrosDiez(added), added);
  const custom = { ...club, id: 'mi-2metros10', groupName: 'Grupo personalizado' };
  const customOffer = { ...newTransferEvent('oferta-2metros10-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includeDosMetrosDiez({ ...old, clubs: [STARTING_CLUB, custom], events: [customOffer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]);
  assert.deepEqual(updated.events, [customOffer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});
