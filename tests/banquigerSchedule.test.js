import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBanquigerCalendarRounds, mergeBanquigerCalendarRounds, resolveBanquigerSchedule } from '../src/utils/banquigerSchedule.js';
import { saveStoredBanquigerRounds, getStoredBanquigerRounds } from '../src/utils/banquigerStorage.js';

const settings = { automaticSchedule: true, budget: 5 };
const rounds = buildBanquigerCalendarRounds();

test('20 jornadas oficiales vinculadas a los partidos; los descansos no juegan', () => {
  assert.equal(rounds.length, 20);
  assert.equal(new Set(rounds.map((round) => round.matchId)).size, 20);
  assert.equal(rounds.some((round) => [7, 18].includes(round.round)), false);
  assert.equal(rounds.at(-1).round, 22);
});

test('cierra exactamente al inicio del partido en la zona horaria de Madrid', () => {
  assert.equal(rounds[0].deadline, '2026-10-17T18:45:00+02:00');
  assert.equal(rounds[2].deadline, '2026-11-07T17:30:00+01:00');
  assert.equal(rounds.at(-1).deadline, '2027-05-08T17:30:00+02:00');
  const kickoff = Date.parse(rounds[0].deadline);
  assert.equal(resolveBanquigerSchedule(settings, rounds, kickoff - 1).settings.marketStatus, 'open');
  assert.equal(resolveBanquigerSchedule(settings, rounds, kickoff).settings.marketStatus, 'closed');
});

test('solo se abre la primera jornada y espera la publicación antes de avanzar', () => {
  const start = resolveBanquigerSchedule(settings, rounds, Date.parse('2026-10-12T00:00Z'));
  assert.equal(start.rounds.filter((round) => round.status === 'open').length, 1);
  assert.equal(start.rounds[1].status, 'scheduled');
  const after = resolveBanquigerSchedule(settings, rounds, Date.parse('2026-10-18T00:00Z'));
  assert.equal(after.currentRound.round, 1);
  assert.equal(after.settings.marketStatus, 'closed');
  const published = rounds.map((round, index) => ({ ...round, scored: index === 0 }));
  const next = resolveBanquigerSchedule(settings, published, Date.parse('2026-10-18T00:00Z'));
  assert.equal(next.currentRound.round, 2);
  assert.equal(next.settings.marketStatus, 'open');
});

test('salta las jornadas de descanso y deja cerrado el mercado al acabar la temporada', () => {
  const published = rounds.map((round) => ({ ...round, scored: round.round <= 6 }));
  assert.equal(resolveBanquigerSchedule(settings, published, Date.parse('2026-12-12T12:00Z')).currentRound.round, 8);
  const finished = resolveBanquigerSchedule(settings, rounds.map((round) => ({ ...round, scored: true })), Date.parse('2027-05-09T12:00Z'));
  assert.equal(finished.settings.marketStatus, 'closed');
});

test('recupera los nuevos partidos sin perder jornadas históricas ni puntuaciones publicadas', () => {
  const historical = { id: 'round-0', name: 'Prueba', scored: true, status: 'closed' };
  const merged = mergeBanquigerCalendarRounds([historical, { ...rounds[0], scored: true }]);
  assert.equal(merged.length, 21);
  assert.equal(merged[0].scored, true);
  assert.deepEqual(merged.at(-1), historical);
  assert.equal(mergeBanquigerCalendarRounds(merged).length, 21);
});

test('conserva los metadatos al guardar y recuperar las jornadas', () => {
  const data = new Map();
  global.window = { localStorage: { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) } };
  try {
    saveStoredBanquigerRounds(rounds);
    const saved = getStoredBanquigerRounds();
    assert.equal(saved[0].matchId, 22);
    assert.equal(saved[0].automatic, true);
    assert.equal(saved[0].season, '2026-2027');
    assert.equal(saved[1].status, 'scheduled');
  } finally {
    delete global.window;
  }
});

test('permite conservar la gestión manual cuando se desactiva el calendario automático', () => {
  const manual = { automaticSchedule: false, currentRound: 'Prueba', marketStatus: 'open' };
  assert.deepEqual(resolveBanquigerSchedule(manual, rounds).settings, manual);
});
