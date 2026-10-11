import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativeGender, messageForProfile } from '../src/utils/careerNarrative.js';
import { createCareer, advanceCareer, resolveSeason } from '../src/utils/careerEngine.js';
import { DEFAULT_CAREER_CONFIG as CONFIG } from '../src/data/careerData.js';
import { CAREER_WELCOME_MESSAGES } from '../src/data/careerConversations.js';

const profile = { name: 'Prueba', number: 7, position: 'Base', archetype: 'allround' };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

test('marcas o/a y os/as adaptan el trato sin alterar texto sin marcar ni enlaces', () => {
  const text = '¡Bienvenido/a! primo/a, preparado/a. BIENVENIDO/A. Bienvenidos/as';
  assert.equal(messageForProfile(text, { gender: 'masculino' }), '¡Bienvenido! primo, preparado. BIENVENIDO. Bienvenidos');
  assert.equal(messageForProfile(text, { gender: 'femenino' }), '¡Bienvenida! prima, preparada. BIENVENIDA. Bienvenidas');
  assert.equal(messageForProfile('Bienvenido/a', { team: 'femenino' }), 'Bienvenida');
  assert.equal(messageForProfile('Bienvenido/a', {}), 'Bienvenido/a');
  const unchanged = 'Carlos Torres y tus compañeros. https://ejemplo.es/bienvenido/a jugador/a 24/7';
  assert.equal(messageForProfile(unchanged, { gender: 'femenino' }), unchanged);
});

test('bienvenida conserva los cuatro autores, orden, frases y emojis suministrados', () => {
  assert.deepEqual(CAREER_WELCOME_MESSAGES.map((m) => m.sender), ['Carlos Torres', 'Dani González', 'Unai Suárez', 'Javier Torres']);
  assert.equal(new Set(CAREER_WELCOME_MESSAGES.map((m) => m.id)).size, 4);
  for (const [gender, greeting] of [['masculino', 'Bienvenido'], ['femenino', 'Bienvenida']]) {
    const lines = CAREER_WELCOME_MESSAGES.map((m) => messageForProfile(m.text, { gender }));
    assert.deepEqual(lines, [
      `¡${greeting} al equipo!`,
      `${greeting}  🫶`,
      'Aquí no se da la bienvenida hasta que respondas a esta pregunta. ¿Qué opinas de la serie Los Anillos de Poder?',
      `¡${greeting}! Te explico las normas básicas: pasarlo bien y no hacer antideportivas a tus ${gender === 'femenino' ? 'compañeras' : 'compañeros'} de equipo (a los rivales opcional).`,
    ]);
  }
  assert.equal(CAREER_WELCOME_MESSAGES[0].text, '¡Bienvenido/a al equipo!');
});

test('el género solo elige el trato narrativo, con compatibilidad de perfiles antiguos', () => {
  const text = { masculino: 'Bienvenido, primo.', femenino: 'Bienvenida, prima.' };
  assert.equal(messageForProfile(text, { gender: 'masculino' }), text.masculino);
  assert.equal(messageForProfile(text, { gender: 'femenino' }), text.femenino);
  assert.equal(messageForProfile(text, { team: 'femenino' }), text.femenino);
  assert.equal(messageForProfile('Un equipo mixto', { gender: 'femenino' }), 'Un equipo mixto');
  assert.equal(narrativeGender({ gender: 'femenino', team: 'masculino' }), 'femenino');
  const oldProfile = { ...profile, team: 'femenino' };
  const c = createCareer(oldProfile, CONFIG, seeded(1));
  assert.equal(c.profile.gender, 'femenino'); assert(!('team' in c.profile));
  assert.equal(oldProfile.team, 'femenino');
  assert.throws(() => createCareer({ ...profile, gender: 'invalid' }));
});

test('100 parejas de carreras idénticas: género no altera eventos, potencial, resultados ni retiradas', () => {
  // Include historical event team filters to ensure they are ignored, too.
  const config = { ...CONFIG, events: CONFIG.events.map((event, i) => ({ ...event, team: i % 2 ? 'masculino' : 'femenino' })) };
  for (let seed = 1; seed <= 100; seed++) {
    const run = (gender) => {
      const rng = seeded(seed);
      let c = createCareer({ ...profile, gender }, config, rng);
      while (c.phase !== 'retired') c = c.phase === 'event' ? resolveSeason(c, rng() < .7, rng) : advanceCareer(c, config.events, rng);
      const { profile: player, ...simulation } = c;
      assert.equal(player.gender, gender);
      return simulation;
    };
    assert.deepEqual(run('masculino'), run('femenino'));
  }
});
