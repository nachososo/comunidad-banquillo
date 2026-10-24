import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublishedRoundRankings, buildRoundLeaderboard } from '../src/utils/banquigerRankings.js';

test('published rounds default to latest scheduled round, excluding unpublished rounds', () => {
  const rounds = [{ name: 'Jornada 1', matchId: 22 }, { name: 'Jornada 2', matchId: 23 }, { name: 'Jornada 3', matchId: 24 }];
  const results = [{ round: 'Jornada 2', ranking: [{ points: 90 }] }, { round: 'Jornada 1', ranking: [{ points: 17 }] }, { round: 'Jornada 3', ranking: [] }];
  const published = getPublishedRoundRankings(results, rounds);
  assert.deepEqual(published.map(result => result.matchId), [23, 22]);
});

test('historical ranking preserves settled points including powers and frozen rosters', () => {
  const result = { round: 'Jornada 1', matchId: 22, ranking: [
    { id: 'a', team: 'Old name', points: 17, basePoints: 12, powerDelta: 5, selectedIds: [108, 104], lineupSlots: ['104', '108'] },
    { id: 'b', team: 'Other', points: 18, selectedIds: ['111'], lineupSlots: ['111'] },
  ] };
  const teams = [{ id: 'a', user_id: 'me', name: 'New name', manager_name: 'Carlos', selected_ids: ['115'], total_points: 900 }, { id: 'new', manager_name: 'New participant' }];
  const ranking = buildRoundLeaderboard(result, teams, 'me');
  assert.equal(ranking.length, 2);
  assert.equal(ranking[0].id, 'b');
  assert.equal(ranking[0].winner, true);
  const own = ranking[1];
  assert.equal(own.points, 17);
  assert.equal(own.team, 'Old name');
  assert.equal(own.manager, 'Carlos');
  assert.equal(own.current, true);
  assert.equal(own.matchId, 22);
  assert.deepEqual(own.selectedIds, ['108', '104']);
  assert.deepEqual(own.lineupSlots, ['104', '108']);
  assert.equal(result.ranking[0].id, 'a');
});

test('tied leaders share winner status and rank, with stable order', () => {
  const ranking = buildRoundLeaderboard({ round: 'Jornada 1', ranking: [
    { id: 'b', points: 17 }, { id: 'c', points: -2 }, { id: 'a', points: 17 },
  ] });
  assert.deepEqual(ranking.map(({ id, rank, winner }) => ({ id, rank, winner })), [
    { id: 'a', rank: 1, winner: true }, { id: 'b', rank: 1, winner: true }, { id: 'c', rank: 3, winner: false },
  ]);
  assert.deepEqual(buildRoundLeaderboard(undefined), []);
});

const { buildBanquigerHonours } = await import('../src/utils/banquigerRankings.js');
const honoursRounds = [
  { name: 'Jornada 1 · 2026/2027', season: '2026-2027', automatic: true, matchId: 22 },
  { name: 'Jornada 2 · 2026/2027', season: '2026-2027', automatic: true, matchId: 23 },
];
const honoursTeams = [{ id: 'a', user_id: 'me', name: 'Current name', manager_name: 'Carlos' }, { id: 'b', manager_name: 'Julio' }];
const honoursResult = (round, a, b) => ({ round, ranking: [
  { id: 'a', team: 'Old name', points: a, selectedIds: ['108'] },
  { id: 'b', team: 'Other', points: b, selectedIds: ['104'] },
] });

test('honours count shared round victories and wait for every scheduled round before league title', () => {
  const first = honoursResult(honoursRounds[0].name, 17, 17);
  const honours = buildBanquigerHonours([first], honoursRounds, honoursTeams, 'me');
  assert.equal(honours.victories[0].winners.length, 2);
  assert.equal(honours.own.roundWins, 1);
  assert.equal(honours.own.leagueWins, 0);
  assert.equal(honours.own.team, 'Current name');
  assert.deepEqual(honours.champions, []);
});

test('league titles use summed settled results, ignoring current roster and stored totals', () => {
  const results = [honoursResult(honoursRounds[0].name, 17, 17), honoursResult(honoursRounds[1].name, 90, 89)];
  const honours = buildBanquigerHonours(results, honoursRounds, honoursTeams.map(team => ({ ...team, total_points: 999, selected_ids: ['115'] })), 'me');
  assert.equal(honours.champions.length, 1);
  assert.deepEqual(honours.champions[0].winners.map(winner => [winner.id, winner.points]), [['a', 107]]);
  assert.equal(honours.own.roundWins, 2);
  assert.equal(honours.own.leagueWins, 1);
  assert.equal(honours.winners[1].roundWins, 1);
});

test('league ties share titles and separate seasons do not crown an unfinished league', () => {
  const rounds = [...honoursRounds, { name: 'Jornada 1 · 2027/2028', season: '2027-2028', automatic: true }];
  const results = [honoursResult(honoursRounds[0].name, 10, 20), honoursResult(honoursRounds[1].name, 20, 10)];
  const honours = buildBanquigerHonours(results, rounds, honoursTeams, 'me');
  assert.equal(honours.champions.length, 1);
  assert.equal(honours.champions[0].winners.length, 2);
  assert.equal(honours.winners.every(winner => winner.leagueWins === 1), true);
  assert.deepEqual(buildBanquigerHonours().winners, []);
});
