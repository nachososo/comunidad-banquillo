import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BLUE_DEVILS, CATACROCKERS, GMADRID, RAMONES, OLIMPICO_ALCOBENDAS, MIYAMA, CLUB_TIERS, STARTING_CLUB, minimumOverallForClub, validateClubs } from '../src/data/careerClubs.js';
import { BLUE_DEVILS_OFFER, CATACROCKERS_OFFER, GMADRID_OFFER, RAMONES_OFFER, OLIMPICO_ALCOBENDAS_OFFER, MIYAMA_OFFER, DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { advanceCareer, createCareer, eligibleEvents, resolveSeason, validateConfig } from '../src/utils/careerEngine.js';
import { LOCAL_CAREER_CATALOG_KEY, includeBlueDevils, includeCatacrockers, includeGMadrid, includeRamones, includeOlimpicoAlcobendas, includeMiyama, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';

const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
const career = () => ({ ...createCareer(profile, DEFAULT_CAREER_CONFIG, () => .5), age: 25, appearances: {} });

test('Miyama: tier 4, mínimo 87, oferta privada y logo horizontal con alfa', async () => {
  assert.equal(MIYAMA.tier, 4); assert.equal(minimumOverallForClub(MIYAMA), 87);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === MIYAMA.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === MIYAMA_OFFER.id));
  for (const overall of [0, 70, 86, 87, 100]) assert.equal(eligibleEvents([MIYAMA_OFFER], { ...career(), overall }).length, overall >= 87 ? 1 : 0);
  const offered = advanceCareer({ ...career(), overall: 87, phase: 'result' }, [MIYAMA_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de Miyama');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, MIYAMA);
  assert.equal(signed.lastResult.club.groupName, 'Miyama');
  assert.equal(signed.lastResult.club.logo, '/img/miyama.png');
  assert.equal(eligibleEvents([MIYAMA_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + MIYAMA.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png[25], 6);
  assert(png.readUInt32BE(16) > png.readUInt32BE(20));
});

test('incorpora Miyama una vez y respeta personalizaciones, pausas y borrados', () => {
  const old = { version: 2, clubPackVersion: 5, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeMiyama(old);
  assert.deepEqual(old, before); assert.equal(added.clubPackVersion, 6);
  assert.deepEqual(added.clubs, [STARTING_CLUB, MIYAMA]); assert.deepEqual(added.events, [MIYAMA_OFFER]);
  assert.deepEqual(includeMiyama(added), added);
  const custom = { ...MIYAMA, id: 'mi-miyama', groupName: 'Grupo personalizado' };
  const offer = { ...newTransferEvent('oferta-miyama-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includeMiyama({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]); assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});

test('Olímpico Alcobendas: tier 3, mínimo 80, oferta privada y logo horizontal con alfa', async () => {
  assert.equal(OLIMPICO_ALCOBENDAS.tier, 3); assert.equal(minimumOverallForClub(OLIMPICO_ALCOBENDAS), 80);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === OLIMPICO_ALCOBENDAS.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === OLIMPICO_ALCOBENDAS_OFFER.id));
  for (const overall of [0, 70, 79, 80, 100]) assert.equal(eligibleEvents([OLIMPICO_ALCOBENDAS_OFFER], { ...career(), overall }).length, overall >= 80 ? 1 : 0);
  const offered = advanceCareer({ ...career(), overall: 80, phase: 'result' }, [OLIMPICO_ALCOBENDAS_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de Olímpico Alcobendas');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, OLIMPICO_ALCOBENDAS);
  assert.equal(signed.lastResult.club.groupName, 'Olímpico Alcobendas');
  assert.equal(signed.lastResult.club.logo, '/img/olimpico-alcobendas.png');
  assert.equal(eligibleEvents([OLIMPICO_ALCOBENDAS_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + OLIMPICO_ALCOBENDAS.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png[25], 6);
  assert(png.readUInt32BE(16) > png.readUInt32BE(20));
  const css = await readFile('src/components/career/career.css', 'utf8');
  assert.match(css, /\.career-group-avatar img\s*\{[^}]*object-fit:contain/);
});

test('incorpora Olímpico Alcobendas una vez y respeta personalizaciones, pausas y borrados', () => {
  const old = { version: 2, clubPackVersion: 4, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeOlimpicoAlcobendas(old);
  assert.deepEqual(old, before); assert.equal(added.clubPackVersion, 5);
  assert.deepEqual(added.clubs, [STARTING_CLUB, OLIMPICO_ALCOBENDAS]); assert.deepEqual(added.events, [OLIMPICO_ALCOBENDAS_OFFER]);
  assert.deepEqual(includeOlimpicoAlcobendas(added), added);
  const custom = { ...OLIMPICO_ALCOBENDAS, id: 'mi-olimpico', groupName: 'Grupo personalizado' };
  const offer = { ...newTransferEvent('oferta-olimpico-personalizada', custom.id), enabled: false, chance: 60 };
  const updated = includeOlimpicoAlcobendas({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]); assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});

test('Ramones: tier 2, mínimo 70, oferta privada y logo transparente', async () => {
  assert.equal(RAMONES.tier, 2); assert.equal(minimumOverallForClub(RAMONES), 70);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === RAMONES.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === RAMONES_OFFER.id));
  for (const overall of [0, 40, 69, 70, 87, 100]) assert.equal(eligibleEvents([RAMONES_OFFER], { ...career(), overall }).length, overall >= 70 ? 1 : 0);
  const offered = advanceCareer({ ...career(), overall: 70, phase: 'result' }, [RAMONES_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de Ramones');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, RAMONES); assert.equal(signed.lastResult.club.groupName, 'Ramones');
  assert.equal(signed.lastResult.club.logo, '/img/ramones.png');
  assert.equal(eligibleEvents([RAMONES_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + RAMONES.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png[25], 6);
});

test('incorpora Ramones una vez, preservando clubes eliminados y ofertas personalizadas', () => {
  const old = { version: 2, clubPackVersion: 3, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeRamones(old);
  assert.deepEqual(old, before); assert.equal(added.clubPackVersion, 4);
  assert.deepEqual(added.clubs, [STARTING_CLUB, RAMONES]); assert.deepEqual(added.events, [RAMONES_OFFER]);
  assert.deepEqual(includeRamones(added), added);
  const custom = { ...RAMONES, id: 'mis-ramones', groupName: 'Grupo propio' };
  const offer = { ...newTransferEvent('oferta-ramones-propia', custom.id), enabled: false, chance: 60 };
  const updated = includeRamones({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]); assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});

test('GMadrid: tier 4, umbral 87, oferta privada y cambio de identidad al fichar', async () => {
  assert.equal(GMADRID.tier, 4); assert.equal(minimumOverallForClub(GMADRID), 87);
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === GMADRID.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === GMADRID_OFFER.id));
  for (const overall of [40, 86, 87, 100]) assert.equal(eligibleEvents([GMADRID_OFFER], { ...career(), overall }).length, overall >= 87 ? 1 : 0);
  const offered = advanceCareer({ ...career(), overall: 87, phase: 'result' }, [GMADRID_OFFER], () => .5);
  assert.equal(offered.pendingEvent.scene.format, 'direct');
  assert.equal(offered.pendingEvent.scene.author.name, 'Coordinación de GMadrid');
  const signed = resolveSeason(offered, true, () => .5);
  assert.deepEqual(signed.currentClub, GMADRID); assert.equal(signed.lastResult.club.groupName, 'GMadrid');
  assert.equal(signed.lastResult.club.logo, '/img/gmadrid.png');
  assert.equal(eligibleEvents([GMADRID_OFFER], { ...signed, overall: 100, appearances: {} }).length, 0);
  const png = await readFile('public' + GMADRID.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png[25], 6);
});

test('incorpora GMadrid sin recuperar clubes borrados y conserva personalizaciones y eliminaciones', () => {
  const old = { version: 2, clubPackVersion: 2, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old), added = includeGMadrid(old);
  assert.deepEqual(old, before); assert.equal(added.clubPackVersion, 3);
  assert.deepEqual(added.clubs, [STARTING_CLUB, GMADRID]); assert.deepEqual(added.events, [GMADRID_OFFER]);
  assert.deepEqual(includeGMadrid(added), added);
  const custom = { ...GMADRID, id: 'mi-gmadrid', groupName: 'Grupo propio' };
  const offer = { ...newTransferEvent('oferta-gmadrid-propia', custom.id), enabled: false, chance: 80 };
  const updated = includeGMadrid({ ...old, clubs: [STARTING_CLUB, custom], events: [offer] });
  assert.deepEqual(updated.clubs, [STARTING_CLUB, custom]); assert.deepEqual(updated.events, [offer]);
  const removed = { ...updated, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  saveLocalCareerCatalog(removed, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), removed);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(updated)), updated);
});

test('cuatro tiers municipales: sin mínimo, 70, 80 y 87; clubes antiguos sin requisito nuevo', () => {
  assert.deepEqual(Object.keys(CLUB_TIERS), ['1', '2', '3', '4']);
  assert.deepEqual(Object.values(CLUB_TIERS).map((tier) => tier.minOverall), [0, 70, 80, 87]);
  assert.equal(minimumOverallForClub(STARTING_CLUB), 0);
  for (const tier of [1, 2, 3, 4]) {
    const club = { ...BLUE_DEVILS, tier }, min = CLUB_TIERS[tier].minOverall;
    const current = { ...career(), clubs: [STARTING_CLUB, club] };
    for (const overall of [0, 69, 70, 79, 80, 86, 87, 100]) {
      const eligible = eligibleEvents([BLUE_DEVILS_OFFER], { ...current, overall });
      assert.equal(eligible.length, overall >= min ? 1 : 0, 'tier ' + tier + ', media ' + overall);
    }
  }
});

test('media mínima personalizada opcional y validación estricta de tiers', () => {
  assert.equal(minimumOverallForClub({ tier: 4, minOverall: null }), 87);
  assert.equal(minimumOverallForClub({ tier: 4, minOverall: 90 }), 90);
  assert.equal(minimumOverallForClub({ tier: 4, minOverall: 0 }), 0);
  const custom = { ...BLUE_DEVILS, minOverall: 92 };
  for (const overall of [91, 92]) assert.equal(eligibleEvents([BLUE_DEVILS_OFFER], { ...career(), overall, clubs: [STARTING_CLUB, custom] }).length, overall === 92 ? 1 : 0);
  for (const tier of [0, 5, '4', 1.5, null]) assert(validateClubs([STARTING_CLUB, { ...BLUE_DEVILS, tier }]).length);
  for (const minOverall of [-1, 101, '87', 87.5, '']) assert(validateClubs([STARTING_CLUB, { ...BLUE_DEVILS, minOverall }]).length);
  assert.deepEqual(validateConfig(DEFAULT_CAREER_CONFIG), []);
});

test('Blue Devils está configurado con tier 4, logo transparente y oferta privada editable', async () => {
  assert.equal(BLUE_DEVILS.tier, 4); assert.equal(minimumOverallForClub(BLUE_DEVILS), 87);
  assert.equal(BLUE_DEVILS.groupName, 'Blue Devils');
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === BLUE_DEVILS.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === BLUE_DEVILS_OFFER.id));
  assert.equal(BLUE_DEVILS_OFFER.presentation.format, 'direct'); assert.equal(BLUE_DEVILS_OFFER.chance, 100);
  const png = await readFile('public' + BLUE_DEVILS.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6); // Original PNG uses RGBA; not flattened onto white.
});

test('comprueba el mínimo al abrir temporada y al resolver, sin gastar azar en ofertas inválidas', () => {
  const low = { ...career(), overall: 86, phase: 'result' };
  const high = { ...low, overall: 87 };
  assert.notEqual(advanceCareer(low, [BLUE_DEVILS_OFFER], () => .5).pendingEvent.category, 'transfer');
  const offered = advanceCareer(high, [BLUE_DEVILS_OFFER], () => .5);
  assert.equal(offered.pendingEvent.targetClubId, BLUE_DEVILS.id);
  assert.equal(offered.pendingEvent.scene.author.name, BLUE_DEVILS.contactName);
  let draws = 0;
  assert.throws(() => resolveSeason({ ...offered, overall: 86 }, true, () => { draws++; return .5; }), /media/);
  assert.equal(draws, 0);
  const signed = resolveSeason(offered, true, () => .5);
  assert.equal(signed.currentClub.id, BLUE_DEVILS.id);
  const afterDrop = advanceCareer({ ...signed, overall: 50 }, [], () => .5);
  assert.equal(afterDrop.currentClub.id, BLUE_DEVILS.id); // eligibility is not automatic expulsion
});

test('añade Blue Devils a catálogos locales anteriores sin sobrescribir ni escribir al leer', () => {
  const old = { version: 2, settings: { gamesPerSeason: 20, difficulty: 60 }, events: [], clubs: [STARTING_CLUB] };
  const before = structuredClone(old), text = JSON.stringify(old);
  const storage = { getItem: () => text, setItem: () => { throw new Error('No escribir durante la lectura'); } };
  const result = readLocalCareerCatalog(storage);
  assert.deepEqual(old, before); assert.deepEqual(result.settings, old.settings);
  assert.deepEqual(result.clubs, DEFAULT_CAREER_CONFIG.clubs);
  assert.deepEqual(result.events, DEFAULT_CAREER_CONFIG.events.filter((event) => event.category === 'transfer'));
  assert.deepEqual(includeBlueDevils(result), result);
  const legacy = { ...old }; delete legacy.clubs;
  assert.deepEqual(includeBlueDevils(legacy).clubs, [STARTING_CLUB, BLUE_DEVILS]);
});

test('no duplica clubes ni ofertas personalizadas y respeta eliminaciones guardadas', () => {
  const custom = { ...BLUE_DEVILS, id: 'mi-blue', groupName: 'Grupo personalizado', logo: '/img/personalizado.png' };
  const offer = { ...newTransferEvent('mi-oferta', custom.id), enabled: false, chance: 50 };
  const old = { version: 2, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB, custom], events: [offer] };
  const added = includeBlueDevils(old);
  assert.deepEqual(added.clubs, old.clubs); assert.deepEqual(added.events, old.events);
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const deleted = { ...added, clubPackVersion: DEFAULT_CAREER_CONFIG.clubPackVersion, clubs: [STARTING_CLUB], events: [] };
  saveLocalCareerCatalog(deleted, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), deleted);
  assert.deepEqual(parseCareerCatalog(memory.get(LOCAL_CAREER_CATALOG_KEY)), deleted);
});

test('Catacrockers: tier 1 sin mínimo, oferta privada y logo original con alfa', async () => {
  assert.equal(CATACROCKERS.tier, 1); assert.equal(minimumOverallForClub(CATACROCKERS), 0);
  assert.equal(CATACROCKERS.groupName, 'Catacrockers');
  assert(DEFAULT_CAREER_CONFIG.clubs.some((club) => club.id === CATACROCKERS.id));
  assert(DEFAULT_CAREER_CONFIG.events.some((event) => event.id === CATACROCKERS_OFFER.id));
  for (const overall of [0, 40, 69, 87, 100]) assert.equal(eligibleEvents([CATACROCKERS_OFFER], { ...career(), overall }).length, 1);
  assert.equal(eligibleEvents([CATACROCKERS_OFFER], { ...career(), age: 17 }).length, 0);
  const opened = advanceCareer({ ...career(), phase: 'result' }, [CATACROCKERS_OFFER], () => .5);
  assert.equal(opened.pendingEvent.scene.format, 'direct');
  assert.equal(opened.pendingEvent.scene.author.name, CATACROCKERS.contactName);
  const signed = resolveSeason(opened, true, () => .5);
  assert.deepEqual(signed.currentClub, CATACROCKERS);
  assert.equal(signed.lastResult.club.logo, '/img/catacrockers.png');
  assert.equal(eligibleEvents([CATACROCKERS_OFFER], { ...signed, appearances: {} }).length, 0);
  const png = await readFile('public' + CATACROCKERS.logo);
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png[25], 6);
});

test('la segunda incorporación añade solo Catacrockers sin resucitar Blue Devils eliminado', () => {
  const old = { version: 2, clubPackVersion: 1, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB], events: [] };
  const before = structuredClone(old);
  const added = includeCatacrockers(old);
  assert.deepEqual(old, before);
  assert.deepEqual(added.clubs, [STARTING_CLUB, CATACROCKERS]);
  assert.deepEqual(added.events, [CATACROCKERS_OFFER]);
  assert.equal(added.clubPackVersion, 2); assert.deepEqual(includeCatacrockers(added), added);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(added)), added);
});

test('conserva Catacrockers personalizado o pausado sin duplicarlo', () => {
  const custom = { ...CATACROCKERS, id: 'mis-catacrockers', groupName: 'Mi grupo', contactName: 'Mi contacto' };
  const offer = { ...newTransferEvent('oferta-personalizada', custom.id), enabled: false };
  const old = { version: 2, clubPackVersion: 1, settings: DEFAULT_CAREER_CONFIG.settings, clubs: [STARTING_CLUB, custom], events: [offer] };
  const added = includeCatacrockers(old);
  assert.deepEqual(added.clubs, old.clubs); assert.deepEqual(added.events, old.events);
  const removed = { ...added, clubs: [STARTING_CLUB], events: [] };
  assert.deepEqual(includeCatacrockers(removed), removed);
});
