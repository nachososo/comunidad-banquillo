import test from 'node:test';
import assert from 'node:assert/strict';
import { isBanquigerRosterSizeValid } from '../src/utils/banquigerPositions.js';
import { scorePowerRound } from '../src/utils/banquigerPowers.js';
test('five, six and seven recruits participate; four, eight and duplicate recruits do not', () => {
  for (const n of [5,6,7]) assert.equal(isBanquigerRosterSizeValid(Array.from({length:n}, (_,i)=>String(i))), true);
  for (const n of [0,4,8]) assert.equal(isBanquigerRosterSizeValid(Array.from({length:n}, (_,i)=>String(i))), false);
  assert.equal(isBanquigerRosterSizeValid(['a','a','b','c','d']), false);
});
test('optional reserves score only when recruited without changing the five starters', () => {
  const players = Array.from({length:7},(_,i)=>({id:String(i),position:'Base',secondaryPositions:['Escolta'],positionsVersion:2}));
  const teams = [5,6,7].map(n=>({id:String(n),selectedIds:players.slice(0,n).map(p=>p.id),lineupSlots:players.map((p,i)=>i<n?p.id:null)}));
  const ranking = scorePowerRound({teams,players,matchId:22,gameStats:players.map(p=>({matchId:22,playerId:p.id,minutes:'10:00',points:2})),advancedStats:players.map(p=>({matchId:22,playerId:p.id,valuationSource:'federation-direct',valuation:3}))});
  for(const n of [5,6,7]) assert.equal(ranking.find(t=>t.id===String(n)).points,n*3);
});
