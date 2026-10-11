import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CAREER_CONFIG, newTransferEvent } from '../src/data/careerData.js';
import { STARTING_CLUB, validClubLogo } from '../src/data/careerClubs.js';
import { advanceCareer, careerSummary, createCareer, eligibleEvents, resolveSeason, validateConfig } from '../src/utils/careerEngine.js';
import { resolvePresentation, sceneForEvent } from '../src/utils/careerPresentation.js';
import { parseCareerCatalog, saveLocalCareerCatalog, readLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';
import { buildCareerShareText } from '../src/utils/careerShare.js';

const club = { id: 'prueba', name: 'Club de prueba', groupName: 'Quinteto de prueba', logo: '/img/prueba.png', contactName: 'Contacto de prueba', members: ['Miembro de prueba'] };
const profile = { name: 'Prueba', number: 7, gender: 'femenino', position: 'Base', archetype: 'allround' };
const config = () => ({ ...structuredClone(DEFAULT_CAREER_CONFIG), clubs: [structuredClone(STARTING_CLUB), structuredClone(club)], events: [newTransferEvent('offer', club.id)] });
const offerCareer = (catalog = config()) => advanceCareer(resolveSeason(createCareer(profile, catalog, () => .5), false, () => .5), catalog.events, () => .5);

test('oferta privada desde los 18; a los 17 se queda en el club inicial', () => {
  const data = config(), initial = createCareer(profile, data, () => .5), career = offerCareer(data);
  assert.equal(initial.currentClub.id, 'cdb');
  assert.notEqual(initial.pendingEvent.category, 'transfer');
  assert.equal(career.age, 18); assert.equal(career.pendingEvent.category, 'transfer');
  assert.equal(career.pendingEvent.scene.format, 'direct');
  assert.equal(career.pendingEvent.scene.author.name, club.contactName);
  assert.deepEqual(career.pendingEvent.transferClub, club);
});

test('fichar cambia club, logo y grupo antes de simular el año sin reescribir historia', () => {
  const career = offerCareer(), before = structuredClone(career);
  const next = resolveSeason(career, true, () => .5);
  assert.deepEqual(career, before);
  assert.deepEqual(next.currentClub, club);
  assert.deepEqual(next.lastResult.club, club);
  assert.equal(next.lastResult.age, 18); assert(next.lastResult.games > 0);
  assert.equal(next.lastResult.transfer.from.id, 'cdb'); assert.equal(next.lastResult.transfer.to.id, club.id);
  assert.deepEqual(next.seasons[0], before.seasons[0]);
  assert.deepEqual(next.development, before.development);
  assert.equal(next.seasons.length, 2); assert(next.overall >= before.overall);
  assert.deepEqual(careerSummary(next).clubs.map((item) => item.id), ['cdb', club.id]);
  assert.throws(() => resolveSeason(next, true), /ya está resuelta/);
});

test('rechazar o fallar no cambia el club; aplica solo los efectos correspondientes', () => {
  const data = config(); data.events[0].chance = 0; data.events[0].failure = { passing: -3 };
  const career = offerCareer(data), rejected = resolveSeason(career, false, () => .5), failed = resolveSeason(career, true, () => .5);
  for (const next of [rejected, failed]) {
    assert.equal(next.currentClub.id, 'cdb'); assert.equal(next.lastResult.club.id, 'cdb');
    assert.equal(next.lastResult.transfer, null); assert.equal(next.seasons.length, 2);
  }
  assert.deepEqual(rejected.lastResult.event.effects, {});
  assert.deepEqual(failed.lastResult.event.effects, { passing: -3 });
  assert.equal(failed.lastResult.event.success, false);
});

test('excluye autofichajes y respeta club de origen, edades, pausa y repeticiones', () => {
  const data = config(), career = offerCareer(data);
  assert.equal(eligibleEvents(data.events, career).length, 0); // already counted when opened
  const fresh = { ...career, appearances: {} };
  assert.equal(eligibleEvents(data.events, fresh).length, 1);
  for (const event of [{ ...data.events[0], enabled: false }, { ...data.events[0], clubId: club.id }, { ...data.events[0], targetClubId: 'missing' }]) assert.equal(eligibleEvents([event], fresh).length, 0);
  assert.equal(eligibleEvents(data.events, { ...fresh, currentClub: club }).length, 0);
  assert.equal(eligibleEvents(data.events, { ...fresh, age: 17 }).length, 0);
});

test('permite volver a la Comunidad del Banquillo y conserva las tres etapas', () => {
  const data = config(), signed = resolveSeason(offerCareer(data), true, () => .5);
  const back = { ...newTransferEvent('back', 'cdb'), clubId: club.id };
  const returning = advanceCareer(signed, [back], () => .5);
  const home = resolveSeason(returning, true, () => .5);
  assert.equal(home.currentClub.id, 'cdb');
  assert.equal(home.currentClub.groupName, STARTING_CLUB.groupName);
  assert.deepEqual(careerSummary(home).clubs.map((item) => item.id), ['cdb', club.id, 'cdb']);
  const text = buildCareerShareText({ ...home, retirementAge: 19 }, true);
  assert.match(text, /Club de prueba/); assert.match(text, /18 años · Junior · Club de prueba/);
});

test('clubes y ofertas son instantáneas independientes del catálogo editado después', () => {
  const data = config(), career = offerCareer(data);
  data.clubs[1].name = 'Cambio posterior'; data.clubs[1].logo = ''; data.clubs[1].members[0] = 'Cambio';
  data.events[0].targetClubId = 'cdb';
  const next = resolveSeason(career, true, () => .5);
  assert.deepEqual(next.currentClub, club);
  next.currentClub.members[0] = 'Cambio en la partida';
  assert.deepEqual(next.lastResult.club, club);
  assert.deepEqual(career.pendingEvent.transferClub, club);
});

test('valida clubes, referencias y logos locales sin romper catálogos antiguos', () => {
  assert.deepEqual(validateConfig(DEFAULT_CAREER_CONFIG), []);
  assert.deepEqual(validateConfig(config()), []);
  for (const clubs of [null, [], [club], [STARTING_CLUB, STARTING_CLUB], [STARTING_CLUB, { ...club, groupName: '' }], [STARTING_CLUB, { ...club, logo: 'javascript:alert(1)' }]]) assert(validateConfig({ ...config(), clubs }).length);
  for (const patch of [{ targetClubId: 'missing' }, { clubId: club.id }, { minAge: 17 }]) {
    const data = config(); Object.assign(data.events[0], patch); assert(validateConfig(data).length);
  }
  for (const logo of ['', '/img/logo.png', 'data:image/png;base64,aGVsbG8=']) assert(validClubLogo(logo));
  for (const logo of ['https://tracking.example/logo.png', '//tracking.example/logo.png', '/img/../logo.png', 'data:image/svg+xml;base64,aGVsbG8=', null]) assert.equal(validClubLogo(logo), false);
});

test('guardar y exportar incluye clubes, pero nunca guarda partidas ni perfiles', () => {
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const data = config(), saved = saveLocalCareerCatalog({ ...data, career: offerCareer(), profile }, storage);
  assert.deepEqual(saved, data); assert.deepEqual(readLocalCareerCatalog(storage), data);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(data)), data);
  assert.equal('career' in saved, false); assert.equal('profile' in saved, false);
});

test('los mensajes del nuevo grupo no usan la plantilla real del Banquillo', () => {
  const signed = resolveSeason(offerCareer(), true, () => .5);
  const event = DEFAULT_CAREER_CONFIG.events[0];
  assert.equal(resolvePresentation(event, signed).author.name, 'Miembro de prueba');
  assert.equal(resolvePresentation(event, { ...signed, currentClub: { ...club, members: [] } }).author.name, 'Entrenador');
  const presentation = sceneForEvent({ ...newTransferEvent('test', 'prueba'), presentation: { format: 'court' } }, signed);
  assert.equal(presentation.format, 'direct'); assert.equal(presentation.author.name, club.contactName);
});

test('el fichaje conserva habilidades; el nivel del destino cambia minutos y resultados colectivos', () => {
  const career = offerCareer();
  let signingDraws = 0, normalDraws = 0;
  const signed = resolveSeason(career, true, () => { signingDraws++; return .5; });
  const normal = resolveSeason({ ...career, pendingEvent: { ...career.pendingEvent, category: 'community' } }, true, () => { normalDraws++; return .5; });
  assert.equal(signingDraws, normalDraws);
  for (const key of ['attributes', 'development', 'overall', 'injuries', 'peakOverall']) assert.deepEqual(signed[key], normal[key]);
  for (const key of ['games', 'individualAwards']) assert.deepEqual(signed.lastResult[key], normal.lastResult[key]);
  assert(signed.lastResult.minutesPerGame > normal.lastResult.minutesPerGame);
  assert(signed.lastResult.totals.points > normal.lastResult.totals.points);
  assert.equal(signed.lastResult.leagueTier, 1);
  assert.equal(normal.lastResult.leagueTier, 3);
  assert(signed.lastResult.leagueChance < normal.lastResult.leagueChance);
});

test('las ofertas toman la identidad del catálogo de la partida, no una copia incrustada en el evento importado', () => {
  const data = config(); data.events[0].transferClub = { ...club, name: 'Identidad obsoleta' };
  const career = offerCareer(data);
  assert.deepEqual(career.pendingEvent.transferClub, club);
  assert.deepEqual(resolveSeason(career, true, () => .5).currentClub, club);
});
