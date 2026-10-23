import test from 'node:test';
import assert from 'node:assert/strict';
import { powerPlayerRow, scorePowerRound } from '../src/utils/banquigerPowers.js';
test('starters double positive stats while points, misses and turnovers count once', () => {
  const game = { minutes:'20:00', points:10 };
  const stat = { oreb:1,dreb:2,assists:1,steals:1,blocks:1,fg:'1-8',ft:'1-3',turnovers:4 };
  // 10 + 6 - 7 - 2 - 4 = 3; eligible starter adds only +6.
  assert.equal(powerPlayerRow(game,stat,false).f,3);
  assert.equal(powerPlayerRow(game,stat,true).f,9);
  assert.equal(powerPlayerRow(game,stat,true).bonus,6);
});
test('Carlos keeps 10 official valuation and negative-only starters are not penalized twice', () => {
  const carlos = { valuationSource:'federation',valuation:10,fg:'7-7',ft:'3-9',fouls:2 };
  assert.equal(powerPlayerRow({minutes:'43:15',points:18},carlos,true).f,10);
  assert.equal(powerPlayerRow({minutes:'43:15',points:18},{...carlos,valuationSource:'federation-direct'},true).f,10);
  const game = {minutes:'22:21',points:0};
  assert.equal(powerPlayerRow(game,{fg:'0-4',ft:'0-2',turnovers:3},true).f,-9);
  assert.equal(powerPlayerRow(game,{fg:'0-4',ft:'0-2',turnovers:3},false).f,-9);
});
test('miss recovery refunds half the actual penalty for starters and substitutes alike', () => {
  const players=[{id:'p',position:'Base'}],teams=[{id:'t',selectedIds:['p']}];
  const common={teams,players,matchId:1,gameStats:[{matchId:1,playerId:'p',minutes:'20:00',points:10}],advancedStats:[{matchId:1,playerId:'p',fg:'0-4',ft:'0-2',assists:2}]};
  const result=scorePowerRound({...common,uses:[{powerId:'r3',targets:[{teamId:'t',playerIds:['p']}]}]});
  assert.equal(result[0].powerDelta,3);
});
test('starter bonus is positive contributions, even when penalties outweigh them', () => {
  for(let assists=0;assists<=5;assists++) for(let missed=0;missed<=10;missed++) {
    const game={minutes:'10:00',points:3},stat={assists,fg:`0-${missed}`,turnovers:2};
    const bench=powerPlayerRow(game,stat,false),starter=powerPlayerRow(game,stat,true);
    assert.equal(starter.f,3+assists*2-missed-2);
    assert.equal(starter.f-bench.f,assists);
  }
});
