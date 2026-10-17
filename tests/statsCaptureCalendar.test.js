import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStatsSeason, mergeStatsCalendar } from '../src/utils/statsCaptureCalendar.js';

test('a stale saved season cannot override the newest season of the selected team', () => {
  const matches = [
    { team: 'masculine', season: '2025-2026' },
    { team: 'masculine', season: '2026/2027' },
    { team: 'feminine', season: '2025-2026' },
  ];
  assert.equal(resolveStatsSeason(matches, 'masculine', '2025-2026'), '2026-2027');
  assert.equal(resolveStatsSeason(matches, 'feminine', '2026-2027'), '2025-2026');
});

test('detects future seasons automatically and uses settings only when there are no team matches', () => {
  assert.equal(resolveStatsSeason([{ team: 'masculine', season: '2028-2029' }, { team: 'masculine', season: '2027-2028' }], 'masculine', '2025-2026'), '2028-2029');
  assert.equal(resolveStatsSeason([], 'feminine', '2026/2027'), '2026-2027');
  assert.equal(resolveStatsSeason([{ team: 'masculine', season: 'invalid' }], 'masculine', '2025-2026'), '2025-2026');
});

test('uses remote dates and calendar edits while preserving local-only teams', () => {
  const local = [{ id: 1, team: 'masculine', season: '2025-2026' }, { id: 2, team: 'feminine', season: '2025-2026' }];
  const remote = [{ id: 3, team: 'masculine', season: '2026-2027', match_date: '2026-10-17', match_time: '18:45:00', rival: 'PRUSIA' }];
  const merged = mergeStatsCalendar(local, remote);
  assert.deepEqual(merged.map(match => match.id), [2, 3]);
  assert.equal(merged[1].date, '2026-10-17');
  assert.equal(merged[1].time, '18:45');
  assert.equal(resolveStatsSeason(merged, 'masculine', '2025-2026'), '2026-2027');
  assert.equal(local.length, 2);
});

test('retains both legs against the same opponent as separate official matches', () => {
  const matches = mergeStatsCalendar([], [
    { id: 22, team: 'masculine', season: '2026-2027', rival: 'PRUSIA', match_date: '2026-10-17' },
    { id: 32, team: 'masculine', season: '2026-2027', rival: 'PRUSIA', match_date: '2027-01-30' },
  ]);
  assert.deepEqual(matches.map(match => match.id), [22, 32]);
});

test('an unavailable remote calendar keeps the bundled calendar intact', () => {
  const local = [{ id: 1, team: 'masculine', season: '2026-2027', date: '2026-10-17' }];
  assert.deepEqual(mergeStatsCalendar(local, []), local);
});
