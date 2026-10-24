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
