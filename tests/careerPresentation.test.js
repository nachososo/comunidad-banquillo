import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CAREER_CONFIG } from '../src/data/careerData.js';
import { createCareer, resolveSeason, advanceCareer, eligibleEvents, validateConfig } from '../src/utils/careerEngine.js';
import { STARTING_CLUB } from '../src/data/careerClubs.js';
import { CAREER_ADDITIONAL_MEMBERS, CAREER_WELCOME_MESSAGES } from '../src/data/careerConversations.js';
import { AUTHOR_MODES, BAR_LOCATION, BAR_LOCATION_IMAGE, CAREER_CAST, DEFAULT_SHARE_MESSAGE, defaultCourt, defaultPresentation, presentationFor, resolvePresentation, sceneForEvent, validatePresentation } from '../src/utils/careerPresentation.js';
import { LOCAL_CAREER_CATALOG_KEY, catalogForExport, includeEventPresentations, parseCareerCatalog, readLocalCareerCatalog, saveLocalCareerCatalog } from '../src/lib/careerLocalCatalog.js';
import { readFile } from 'node:fs/promises';

const profile = { name: 'Prueba', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' };
const event = DEFAULT_CAREER_CONFIG.events.find((item) => item.id === 'overload');
const config = { ...DEFAULT_CAREER_CONFIG, events: [event] };
const memoryStorage = () => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map };
};

test('plantilla narrativa contiene solo identificador y nombre, sin datos personales ni atributos', () => {
  assert(CAREER_CAST.length > 10);
  assert.equal(new Set(CAREER_CAST.map((person) => person.id)).size, CAREER_CAST.length);
  for (const person of CAREER_CAST) assert.deepEqual(Object.keys(person).sort(), ['id', 'name']);
});

test('los cinco remitentes nuevos son únicos, seleccionables y no cambian la bienvenida', () => {
  assert.deepEqual(CAREER_ADDITIONAL_MEMBERS.map((person) => person.name), ['Irene Crecis', 'Briseida Batalla', 'Gonzalo Carretero', 'Nacho Serrano', 'Daniel Bastardo']);
  for (const person of CAREER_ADDITIONAL_MEMBERS) {
    const matches = CAREER_CAST.filter((member) => member.name === person.name);
    assert.equal(matches.length, 1);
    for (const format of ['group', 'direct', 'bench']) {
      const presentation = { ...defaultPresentation(), format, authorMode: 'member', memberId: matches[0].id };
      assert.deepEqual(validatePresentation(presentation), []);
      assert.deepEqual(resolvePresentation({ ...event, presentation }, { currentClub: STARTING_CLUB }).author, matches[0]);
    }
  }
  assert.deepEqual(CAREER_WELCOME_MESSAGES.map((message) => message.sender), ['Carlos Torres', 'Dani González', 'Unai Suárez', 'Javier Torres']);
});

test('los nuevos miembros participan en el azar del Banquillo, nunca en la plantilla de otro club', () => {
  const seen = new Set();
  const randomEvent = { ...event, presentation: defaultPresentation() };
  for (let i = 0; i < 1000; i++) {
    const career = { currentClub: STARTING_CLUB, age: 20, profile: { name: 'Prueba ' + i, number: i % 100 } };
    const scene = resolvePresentation(randomEvent, career);
    seen.add(scene.author.name);
    assert.deepEqual(resolvePresentation(randomEvent, career), scene);
    assert.equal(resolvePresentation(randomEvent, { ...career, currentClub: { id: 'otro', members: ['Persona del otro club'] } }).author.name, 'Persona del otro club');
  }
  for (const person of CAREER_ADDITIONAL_MEMBERS) {
    assert(seen.has(person.name));
    const fixed = { ...event, presentation: { ...defaultPresentation(), authorMode: 'member', memberId: person.id } };
    assert.equal(resolvePresentation(fixed, { currentClub: { id: 'otro', members: [] } }).author.name, 'Entrenador');
  }
});

test('un evento exclusivo se conserva al guardar y se filtra al salir del Banquillo y regresar', () => {
  const exclusive = { ...event, clubId: 'cdb', presentation: { ...defaultPresentation(), authorMode: 'member', memberId: CAREER_ADDITIONAL_MEMBERS[0].id } };
  const catalog = { ...config, events: [exclusive] }, before = structuredClone(catalog);
  const storage = memoryStorage();
  saveLocalCareerCatalog(catalog, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), catalog);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(catalog)), catalog);
  assert.deepEqual(catalog, before);
  const career = createCareer(profile, catalog, () => .5);
  assert.equal(career.pendingEvent.id, exclusive.id);
  assert.equal(career.pendingEvent.scene.author.name, 'Irene Crecis');
  const eligible = { ...career, age: 25, appearances: {} };
  assert.equal(eligibleEvents([exclusive], eligible).length, 1);
  const away = { ...eligible, currentClub: { id: 'otro', members: ['Otro remitente'] } };
  assert.equal(eligibleEvents([exclusive], away).length, 0);
  assert.equal(eligibleEvents([{ ...exclusive, clubId: 'all', presentation: defaultPresentation() }], away).length, 1);
  assert.equal(eligibleEvents([exclusive], { ...away, currentClub: STARTING_CLUB }).length, 1);
});

test('formatos y autores se resuelven sin tocar el evento; miembro fijo y externo', () => {
  const original = structuredClone(event);
  const fixed = resolvePresentation({ ...event, presentation: { ...defaultPresentation(), authorMode: 'member', memberId: CAREER_CAST[0].id } });
  assert.deepEqual(fixed.author, CAREER_CAST[0]);
  const external = resolvePresentation({ ...event, presentation: { ...defaultPresentation(), format: 'direct', authorMode: 'external', authorName: '  Organización  ' } });
  assert.equal(external.format, 'direct'); assert.equal(external.author.name, 'Organización');
  assert.deepEqual(event, original);
  for (const format of ['group', 'direct', 'instagram', 'x', 'court', 'bench', 'bar']) assert.deepEqual(validatePresentation({ ...defaultPresentation(), format, post: { author: 'Club de barrio', handle: '', title: '', text: 'Inscripciones abiertas.' } }), []);
});

test('autor al azar estable por evento, con variedad entre carreras y sin consumir azar deportivo', () => {
  const names = new Set();
  for (let i = 0; i < 100; i++) {
    const career = { age: 17, profile: { ...profile, name: 'Persona ' + i } };
    const first = resolvePresentation(event, career);
    assert.deepEqual(first, resolvePresentation(event, career)); names.add(first.author.name);
  }
  assert(names.size > 5);
  let drawsA = 0, drawsB = 0;
  const a = createCareer(profile, config, () => { drawsA++; return .5; });
  const simpleConfig = { ...config, events: [{ ...event, presentation: defaultPresentation() }] };
  const b = createCareer(profile, simpleConfig, () => { drawsB++; return .5; });
  assert.equal(drawsA, drawsB);
  const resultA = resolveSeason(a, true, () => .4), resultB = resolveSeason(b, true, () => .4);
  const withoutStory = (year) => { const copy = structuredClone(year); delete copy.event.scene; return copy; };
  assert.deepEqual(withoutStory(resultA.lastResult), withoutStory(resultB.lastResult));
  assert.deepEqual(resultA.lastResult.event.scene, a.pendingEvent.scene);
  const next = advanceCareer(resultA, config.events, () => .5);
  assert.deepEqual(next.seasons[0].event.scene, a.pendingEvent.scene);
});

test('catálogos sin presentación mantienen compatibilidad y no se sobrescriben', () => {
  const legacyEvent = structuredClone(event); delete legacyEvent.presentation;
  const legacy = { ...config, events: [legacyEvent] };
  assert.deepEqual(validateConfig(legacy), []);
  const career = createCareer(profile, legacy, () => .5);
  assert.equal(career.pendingEvent.scene.format, 'group'); assert(CAREER_CAST.some((person) => person.name === career.pendingEvent.scene.author.name));
  assert.equal(legacy.events[0].presentation, undefined);
});

test('firma genérica antigua se adapta en partidas abiertas sin mutar escenas ni autores personalizados', () => {
  assert.equal(AUTHOR_MODES.team, undefined);
  const career = { age: 17, profile };
  const old = { ...event, scene: { ...defaultPresentation(), authorMode: 'team', message: 'Mensaje conservado', author: { id: '', name: 'El equipo' } } };
  const before = structuredClone(old);
  const scene = sceneForEvent(old, career);
  assert(CAREER_CAST.some((person) => person.id === scene.author.id));
  assert.equal(scene.message, 'Mensaje conservado'); assert.deepEqual(sceneForEvent(old, career), scene); assert.deepEqual(old, before);
  assert.deepEqual(validatePresentation({ ...defaultPresentation(), authorMode: 'team' }), []);
  const fixed = { ...event, scene: { ...defaultPresentation(), authorMode: 'external', author: { id: '', name: 'Organización de La Elipa' } } };
  assert.deepEqual(sceneForEvent(fixed, career), fixed.scene);
});

test('validación de presentación rechaza tipos, longitudes, autores y formatos incorrectos', () => {
  for (const p of [null, [], 'x', { format: '__proto__' }, { authorMode: 'desconocido' }, { message: 3 }, { message: 'a'.repeat(1501) }, { authorMode: 'member', memberId: 'missing' }, { authorMode: 'external', authorName: ' ' }, { handle: 'https://example.com' }]) {
    assert(validatePresentation(p).length > 0);
    assert(validateConfig({ ...config, events: [{ ...event, presentation: p }] }).length > 0);
  }
  assert.deepEqual(validatePresentation(undefined), []);
});

test('publicación y mensaje del grupo se editan, serializan y conservan por separado', () => {
  const socialEvent = { ...event, presentation: { ...defaultPresentation(), format: 'instagram', authorMode: 'member', memberId: CAREER_CAST[0].id, message: '¿Nos apuntamos al torneo?', post: { author: 'Torneos del barrio', handle: 'torneos_barrio', title: 'La Elipa', text: 'Inscripciones abiertas para el torneo del sábado.' } } };
  const catalog = { ...config, events: [socialEvent] };
  assert.deepEqual(validateConfig(catalog), []);
  const career = createCareer(profile, catalog, () => .5);
  assert.equal(career.pendingEvent.scene.author.name, CAREER_CAST[0].name);
  assert.equal(career.pendingEvent.scene.post.author, 'Torneos del barrio');
  assert.notEqual(career.pendingEvent.scene.author.name, career.pendingEvent.scene.post.author);
  assert.equal(career.pendingEvent.scene.message, '¿Nos apuntamos al torneo?');
  const result = resolveSeason(career, false, () => .5);
  assert.deepEqual(result.lastResult.event.scene.post, socialEvent.presentation.post);
  assert.equal(result.lastResult.event.scene.message, socialEvent.presentation.message);
  const storage = memoryStorage(); saveLocalCareerCatalog(catalog, storage);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(readLocalCareerCatalog(storage))), catalog);
  const changed = { ...socialEvent, presentation: { ...socialEvent.presentation, message: 'Cambio solo el WhatsApp.' } };
  assert.deepEqual(presentationFor(changed).post, socialEvent.presentation.post);
});

test('publicaciones antiguas y partidas abiertas reciben comentario independiente sin perder texto ni autor', () => {
  const legacy = { ...event, presentation: { format: 'x', authorMode: 'random', message: 'Anuncio antiguo sin modificar.', handle: 'cuenta_anterior' } };
  const before = structuredClone(legacy);
  const adapted = presentationFor(legacy);
  assert.equal(adapted.post.text, legacy.presentation.message); assert.equal(adapted.post.handle, 'cuenta_anterior');
  assert.equal(adapted.message, DEFAULT_SHARE_MESSAGE); assert.deepEqual(legacy, before);
  const oldScene = { ...legacy.presentation, author: CAREER_CAST[0] };
  const openEvent = { ...legacy, scene: oldScene };
  const displayed = sceneForEvent(openEvent, { profile, age: 17 });
  assert.deepEqual(displayed.author, CAREER_CAST[0]); assert.equal(displayed.post.text, 'Anuncio antiguo sin modificar.');
  assert.equal(displayed.post.author, CAREER_CAST[0].name);
  assert.equal(displayed.message, DEFAULT_SHARE_MESSAGE); assert.deepEqual(openEvent.scene, oldScene);
  assert.deepEqual(validateConfig({ ...config, events: [legacy] }), []);
});

test('publicaciones nuevas requieren texto y autor; validación de tipos y límites anidados', () => {
  const p = { ...defaultPresentation(), format: 'x' };
  for (const post of [null, [], 'invalid', {}, { author: '', handle: '', title: '', text: 'Texto' }, { author: 'Organización', handle: '', title: '', text: '' }, { author: 'Organización', handle: 'javascript:alert(1)', title: '', text: 'Texto' }, { author: 'Organización', handle: '', title: '', text: 'a'.repeat(1501) }, { author: 3, handle: '', title: '', text: 'Texto' }]) assert(validatePresentation({ ...p, post }).length);
});

test('pista y banquillo conservan sorteos y estadísticas, y el marcador solo es narrativo', () => {
  for (const format of ['court', 'bench']) {
    const themed = { ...event, presentation: { ...defaultPresentation(), format, message: 'Decisión de prueba.', court: { ...defaultCourt(), homeScore: 120, awayScore: 0, clock: '00:01' } } };
    let drawsA = 0, drawsB = 0;
    const a = createCareer(profile, { ...config, events: [themed] }, () => { drawsA++; return .4; });
    const b = createCareer(profile, config, () => { drawsB++; return .4; });
    assert.equal(drawsA, drawsB);
    for (const accepted of [true, false]) {
      const first = resolveSeason(a, accepted, () => .5), second = resolveSeason(b, accepted, () => .5);
      const clean = (year) => { const copy = structuredClone(year); delete copy.event.scene; return copy; };
      assert.deepEqual(clean(first.lastResult), clean(second.lastResult));
      assert.equal(first.lastResult.event.scene.format, format);
      assert.deepEqual(first.lastResult.event.scene.court, themed.presentation.court);
    }
    assert.deepEqual(parseCareerCatalog(JSON.stringify({ ...config, events: [themed] })).events[0], themed);
  }
});

test('marcador y reloj validan límites y formato sin romper catálogos antiguos', () => {
  for (const court of [null, [], {}, { ...defaultCourt(), homeScore: -1 }, { ...defaultCourt(), awayScore: 201 }, { ...defaultCourt(), homeScore: 1.5 }, { ...defaultCourt(), homeScore: '' }, { ...defaultCourt(), clock: '00:60' }, { ...defaultCourt(), clock: '0:08' }, { ...defaultCourt(), homeLabel: '' }]) assert(validatePresentation({ ...defaultPresentation(), format: 'court', court }).length);
  const legacy = { ...defaultPresentation() }; delete legacy.court;
  assert.deepEqual(validatePresentation(legacy), []);
  assert.deepEqual(presentationFor({ presentation: legacy }).court, defaultCourt());
  assert.deepEqual(validatePresentation({ ...defaultPresentation(), format: 'court', authorMode: 'member', memberId: '' }), []);
});

test('catálogo base asigna escenas en pista y conversaciones sin modificar posibilidades deportivas', () => {
  for (const id of ['winner', 'pressure']) assert.equal(DEFAULT_CAREER_CONFIG.events.find((item) => item.id === id).presentation.format, 'court');
  for (const id of ['first-team', 'mentor']) assert.equal(DEFAULT_CAREER_CONFIG.events.find((item) => item.id === id).presentation.format, 'bench');
  assert.equal(DEFAULT_CAREER_CONFIG.events.find((item) => item.id === 'captain').presentation.format, 'bar');
  assert.equal(DEFAULT_CAREER_CONFIG.events.find((item) => item.id === 'winner').chance, 55);
  assert.equal(DEFAULT_CAREER_CONFIG.events.find((item) => item.id === 'pressure').chance, 75);
});

test('el catálogo usa formatos acordes al contenido, no WhatsApp para todas las situaciones', () => {
  const formats = Object.fromEntries(DEFAULT_CAREER_CONFIG.events.map((event) => [event.id, event.presentation.format]));
  for (const id of ['winner', 'pressure', 'zone', 'comeback']) assert.equal(formats[id], 'court');
  for (const id of ['mechanics', 'reading', 'defense', 'specialist', 'ankle', 'knee', 'retire-injuries', 'retire-chapter']) assert.equal(formats[id], 'bench');
  assert.equal(formats.overload, 'group');
  assert.equal(formats.community, 'instagram');
  assert.equal(formats.school, 'direct');
  assert.equal(formats.captain, 'bar');
  assert.deepEqual(validateConfig(DEFAULT_CAREER_CONFIG), []);
});

test('La Caña de Gonzalo es una localización fija con imagen local y sin azar deportivo', async () => {
  const captain = DEFAULT_CAREER_CONFIG.events.find((event) => event.id === 'captain');
  const scene = resolvePresentation(captain, { age: 22, profile, currentClub: STARTING_CLUB });
  assert.equal(scene.format, 'bar');
  assert.equal(scene.location, BAR_LOCATION);
  assert.equal(BAR_LOCATION_IMAGE, '/img/career-locations/la-cana-de-gonzalo.jpg');
  const image = await readFile('public' + BAR_LOCATION_IMAGE);
  assert(image.length > 100_000 && image.length < 600_000);
  assert.equal(image[0], 0xff); assert.equal(image[1], 0xd8);
  let barDraws = 0, benchDraws = 0;
  const barCareer = createCareer(profile, { ...config, events: [captain] }, () => { barDraws++; return .5; });
  const benchCareer = createCareer(profile, { ...config, events: [{ ...captain, presentation: { ...captain.presentation, format: 'bench' } }] }, () => { benchDraws++; return .5; });
  assert.equal(barDraws, benchDraws);
  const clean = (year) => { const copy = structuredClone(year); delete copy.event.scene; return copy; };
  assert.deepEqual(clean(resolveSeason(barCareer, true, () => .5).lastResult), clean(resolveSeason(benchCareer, true, () => .5).lastResult));
});

test('catálogo antiguo genérico adopta las escenas sin cambiar reglas, pausas ni escribir almacenamiento', () => {
  const legacy = structuredClone(DEFAULT_CAREER_CONFIG);
  delete legacy.presentationPackVersion;
  for (const event of legacy.events) event.presentation = defaultPresentation();
  legacy.events[0].enabled = false;
  legacy.events[1].chance = 23;
  legacy.events[1].success = { shooting: 9 };
  delete legacy.events[2].presentation;
  legacy.events = legacy.events.filter((event) => event.id !== 'mentor');
  const storage = memoryStorage();
  storage.setItem(LOCAL_CAREER_CATALOG_KEY, JSON.stringify(legacy));
  const stored = storage.getItem(LOCAL_CAREER_CATALOG_KEY);
  const updated = readLocalCareerCatalog(storage);
  assert.equal(storage.getItem(LOCAL_CAREER_CATALOG_KEY), stored);
  assert.equal(updated.events.find((event) => event.id === 'winner').presentation.format, 'court');
  assert.equal(updated.events.find((event) => event.id === 'mechanics').presentation.format, 'bench');
  assert.equal(updated.events.find((event) => event.id === 'mentor'), undefined);
  const withoutPresentation = (event) => { const { presentation, ...rest } = event; return rest; };
  assert.deepEqual(updated.events.map(withoutPresentation), legacy.events.map(withoutPresentation));
  assert.deepEqual(validateConfig(updated), []);
  const saved = saveLocalCareerCatalog(updated, storage);
  assert.deepEqual(readLocalCareerCatalog(storage), saved);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(saved)), saved);
  // After migration the editor may intentionally select plain WhatsApp again.
  saved.events[1].presentation = defaultPresentation();
  saveLocalCareerCatalog(saved, storage);
  assert.equal(readLocalCareerCatalog(storage).events[1].presentation.format, 'group');
});

test('la actualización conserva mensajes y presentaciones personalizados y eventos desconocidos', () => {
  const base = DEFAULT_CAREER_CONFIG.events.find((event) => event.id === 'winner');
  for (const patch of [{ message: 'Mi guiño personal' }, { authorMode: 'member', memberId: CAREER_CAST[0].id },
    { location: 'Mi pabellón' }, { format: 'direct' }, { court: { ...defaultCourt(), homeScore: 3 } },
    { post: { author: 'Mi organización', handle: '', title: '', text: 'Mi anuncio' } }]) {
    const customized = { ...base, presentation: { ...defaultPresentation(), ...patch } };
    const catalog = { ...DEFAULT_CAREER_CONFIG, presentationPackVersion: 0, events: [customized] };
    const before = structuredClone(catalog);
    assert.deepEqual(includeEventPresentations(catalog).events[0], customized);
    assert.deepEqual(catalog, before);
  }
  const custom = { ...base, id: 'evento-propio', presentation: defaultPresentation() };
  assert.deepEqual(includeEventPresentations({ ...DEFAULT_CAREER_CONFIG, presentationPackVersion: 0, events: [custom] }).events, [custom]);
});

test('catálogo local independiente: guardar, cargar y exportar no guarda carreras ni tokens', () => {
  const storage = memoryStorage();
  const original = readLocalCareerCatalog(storage); original.events[0].title = 'Cambios de prueba';
  assert.notEqual(DEFAULT_CAREER_CONFIG.events[0].title, 'Cambios de prueba');
  const saved = saveLocalCareerCatalog({ ...original, profile, seasons: [1], saveToken: 'secret' }, storage);
  assert.equal(storage.map.size, 1); assert(storage.map.has(LOCAL_CAREER_CATALOG_KEY));
  assert.deepEqual(readLocalCareerCatalog(storage), saved);
  assert.deepEqual(Object.keys(saved).sort(), ['clubPackVersion', 'clubs', 'events', 'presentationPackVersion', 'settings', 'version']);
  assert.deepEqual(parseCareerCatalog(JSON.stringify(saved)), saved);
  assert.deepEqual(catalogForExport(saved), saved);
});

test('archivos inválidos, cuota y bloqueo del navegador no destruyen el catálogo anterior', () => {
  const storage = memoryStorage(); saveLocalCareerCatalog(config, storage);
  const before = storage.getItem(LOCAL_CAREER_CATALOG_KEY);
  assert.throws(() => saveLocalCareerCatalog({ ...config, events: [{ ...event, chance: 101 }] }, storage));
  assert.equal(storage.getItem(LOCAL_CAREER_CATALOG_KEY), before);
  assert.throws(() => parseCareerCatalog('{'), /JSON/);
  assert.throws(() => parseCareerCatalog('x'.repeat(3 * 1024 * 1024 + 1)), /3 MB/);
  assert.throws(() => parseCareerCatalog('{"version":999}'), /configuración/);
  assert.throws(() => saveLocalCareerCatalog(config, { setItem() { throw new Error('quota'); } }), /exportarlo/);
  assert.throws(() => readLocalCareerCatalog({ getItem() { throw new Error('denied'); } }), /catálogo local/);
});

test('el taller sin login y el catálogo local solo se activan en desarrollo', async () => {
  const admin = await readFile('src/pages/CareerAdminPage.jsx', 'utf8');
  assert.match(admin, /if \(import.meta.env.DEV\) return <CareerAdminEditor local/);
  assert.match(admin, /if \(!isAdmin\) return <Navigate/);
  const localBranch = admin.slice(admin.indexOf('if (local) {'), admin.indexOf('const candidate ='));
  assert.match(localBranch, /saveLocalCareerCatalog/); assert.doesNotMatch(localBranch, /careerRepository/); assert.match(localBranch, /return;/);
  const page = await readFile('src/pages/CareerPage.jsx', 'utf8');
  assert.match(page, /import.meta.env.DEV \? Promise.resolve\(\).then\(\(\) => \(\{ data: readLocalCareerCatalog\(\) \}\)\) : careerRepository.loadConfig\(\)/);
});
