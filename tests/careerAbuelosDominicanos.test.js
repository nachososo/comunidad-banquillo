import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LOS_ABUELOS_DOMINICANOS as club, STARTING_CLUB, minimumOverallForClub } from '../src/data/careerClubs.js';
import { LOS_ABUELOS_DOMINICANOS_OFFER as offer, DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, eligibleEvents, resolveSeason } from '../src/utils/careerEngine.js';
import { includeLosAbuelosDominicanos, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

test('Los Abuelos Dominicanos: tier 1 sin mínimo, oferta desde los 18 e identidad con logo transparente', async () => {
  assert.equal(club.tier, 1);
  assert.equal(minimumOverallForClub(club), 0);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((item) => item.id === club.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((item) => item.id === offer.id));
  const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
  const career = { ...createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5), age: 18, appearances: {} };
  for (const overall of [0, 40, 69, 80, 100]) {
    assert.equal(eligibleEvents([offer], { ...career, overall }).length, 1);
  }
  assert.equal(eligibleEvents([offer], { ...career, age: 17 }).length, 0);
  const offered = advanceCareer({ ...career, overall: 40, phase: 'result' }, [offer], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de Los Abuelos Dominicanos');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, club);
  assert.equal(signed.lastResult.club.groupName, 'Los Abuelos Dominicanos');
  assert.equal(signed.lastResult.club.logo, '/img/los-abuelos-dominicanos.png');
  assert.equal(eligibleEvents([offer], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + club.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6);
});

test('incorpora Los Abuelos Dominicanos una vez y respeta personalizaciones, pausas y borrados', () => {
  const old = { version: 2, clubPackVersion: 10, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeLosAbuelosDominicanos(old);
  assert.deepEqual(old, before);
  assert.equal(added.clubPackVersion, 11);
  assert.deepEqual(added.clubs, [STARTING_CLUB, club]);
  assert.deepEqual(added.events, [offer]);
  assert.deepEqual(includeLosAbuelosDominicanos(added), added);
  const custom = { ...club, id: 'mis-abuelos', groupName: 'Grupo personalizado' };
  const customOffer = { ...newTransferEvent('oferta-abuelos-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includeLosAbuelosDominicanos({ ...old, clubs: [STARTING_CLUB, custom], events: [customOffer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]);
  assert.deepEqual(updated.events, [customOffer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});
