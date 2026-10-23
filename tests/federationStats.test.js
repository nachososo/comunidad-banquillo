import test from 'node:test';
import assert from 'node:assert/strict';
import { getValuation, getRebounds } from '../src/utils/statCalculations.js';
import { powerPlayerRow, scorePowerRound } from '../src/utils/banquigerPowers.js';

test('explicit federation valuation preserves zero and negatives, with ordinary formula unchanged', () => {
  assert.equal(getValuation({ valuationSource: 'federation', valuation: 0, ft: '0-2' }, 2), 0);
  assert.equal(getValuation({ valuationSource: 'federation', valuation: -5 }, 0), -5);
  assert.equal(getValuation({ valuation: -5, ft: '0-2', fouls: 3 }, 0), -2);
  assert.equal(getValuation({ valuationSource: 'federation', valuation: null, ft: '0-2' }, 2), 0);
  assert.equal(getValuation({ valuationSource: 'federation', valuation: '' }, 4), 4);
  assert.equal(getRebounds({ oreb: null, dreb: null }), null);
});

test('federation base doubles only non-point value for an eligible starter', () => {
  const game = { minutes: '43:15', points: 18 };
  const stat = { valuationSource: 'federation', valuation: 10 };
  assert.equal(powerPlayerRow(game, stat, true).f, 2);
  assert.equal(powerPlayerRow(game, stat, false).f, 10);
  assert.equal(powerPlayerRow({ minutes: '00:00', points: 0 }, stat, true).f, 0);
});

test('explicit slots keep out-of-position players at x1', () => {
  const ranking = scorePowerRound({ teams: [{ id: 't', selectedIds: ['p'], lineupSlots: ['p', null, null, null, null, null, null] }],
    players: [{ id: 'p', position: 'Pívot', secondaryPositions: ['Ala-Pívot'], positionsVersion: 2 }],
    gameStats: [{ matchId: 22, playerId: 'p', minutes: '43:15', points: 18 }],
    advancedStats: [{ matchId: 22, playerId: 'p', valuationSource: 'federation', valuation: 10 }], matchId: 22 });
  assert.equal(ranking[0].points, 10);
});
