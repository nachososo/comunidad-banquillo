import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPowerCatalog, mergePowerCatalog, powerPlayerRow, buildPowerLineup, scorePowerRound, validatePowerTargets, POWER_ODDS } from '../src/utils/banquigerPowers.js';
const positions = ['Base','Escolta','Alero','Ala-Pívot','Pívot','Base','Escolta'];
const players = positions.map((position,index) => ({ id: String(index+1), position, name: `P${index+1}` }));
const teams = ['a','b','c','d'].map(id => ({ id, selectedIds: players.map(p => p.id) }));
const gameStats = players.map(p => ({ playerId:p.id, matchId:1, points:10, minutes:'20:00' }));
const advancedStats = players.map(p => ({ playerId:p.id, matchId:1, fg:'4-8', ft:'2-4', threePt:'2-4', oreb:2, dreb:4, assists:3, steals:2, blocks:1, turnovers:0 }));
const score = uses => scorePowerRound({ teams, players, gameStats, advancedStats, matchId:1, uses });
const baseline = score([]);
const targetsFor = card => Array.from({length:card.rivalCount},(_,i) => ({teamId:card.type==='positive'?'a':teams[i+1].id,playerIds:card.count===7?[]:players.slice(card.bench?5:0,(card.bench?5:0)+card.count).map(p=>p.id)}));
const expected = [4,0,6,3,2.8,4,3,3.2,7,10,3,8.4,7,8.4,6,5.6,14,16,9,16,14,16,11.2,12,24,24,24,0,16.8,24,16.8,24];
test('all 32 effects use the original fantasy score and their shared caps', () => {
  assert.equal(defaultPowerCatalog.length,32);
  for (const [i,card] of defaultPowerCatalog.entries()) {
    const result = score([{powerId:card.id,targets:targetsFor(card)}]);
    const impact = result.reduce((sum,t)=>sum+Math.abs(t.points-baseline.find(b=>b.id===t.id).points),0);
    assert.ok(Math.abs(impact-expected[i])<0.02, `${card.name}: ${impact} vs ${expected[i]}`);
    assert.ok(impact<=card.cap+0.02);
  }
});
test('recovery powers require minutes and cap recovery of negative scores', () => {
  const negative = gameStats.map(g=>({...g,points:0}));
  const missed = advancedStats.map(g=>({...g,fg:'0-10',ft:'0-0',oreb:0,dreb:0,assists:0,steals:0,blocks:0}));
  for (const [id,cap] of [['c2',6],['l4',24]]) {
    const options={teams,players,gameStats:negative,advancedStats:missed,matchId:1};
    const base=scorePowerRound(options).find(t=>t.id==='a').points;
    const after=scorePowerRound({...options,uses:[{powerId:id,targets:[{teamId:'a',playerIds:['1']}]}]}).find(t=>t.id==='a').points;
    assert.equal(after-base,cap);
    const unused=scorePowerRound({...options,gameStats:negative.map(g=>({...g,minutes:'00:00'})),uses:[{powerId:id,targets:[{teamId:'a',playerIds:['1']}]}]}).find(t=>t.id==='a').points;
    assert.equal(unused,0);
  }
});
test('combined attacks cannot exceed 60% per player or 24 per team and do not affect other holders', () => {
  const uses=Array.from({length:3},()=>({powerId:'l5',targets:[{teamId:'b',playerIds:['1']}]}));
  const result=score(uses);
  assert.ok(Math.abs(baseline.find(t=>t.id==='b').points-result.find(t=>t.id==='b').points-16.8)<1e-9);
  assert.equal(result.find(t=>t.id==='a').points,baseline.find(t=>t.id==='a').points);
  const whole=score(Array.from({length:3},()=>({powerId:'l6',targets:[{teamId:'b',playerIds:[]}]})));
  assert.equal(baseline.find(t=>t.id==='b').points-whole.find(t=>t.id==='b').points,24);
  assert.deepEqual(score([...uses].reverse()),result);
});
test('bonuses never multiply other powers and attacks never benefit from their bonuses', () => {
  const result=score([{powerId:'l1',targets:[{teamId:'a',playerIds:['1']}]},{powerId:'l5',targets:[{teamId:'a',playerIds:['1']}]}]);
  assert.ok(Math.abs(result.find(t=>t.id==='a').powerDelta-7.2)<1e-9);
});
test('no-show players score zero and first selected player per position is starter', () => {
  assert.equal(powerPlayerRow({minutes:'00:00',points:10},advancedStats[0],true).f,0);
  assert.deepEqual(buildPowerLineup(teams[0].selectedIds,players).map(p=>p.starter),[true,true,true,true,true,false,false]);
});
test('targets enforce distinct opponents, precise counts and previous final ranking eligibility', () => {
  const card=defaultPowerCatalog.find(p=>p.id==='l7');
  assert.equal(validatePowerTargets(card,targetsFor(card),teams,'a',['b','c','d']),'');
  assert.ok(validatePowerTargets(card,targetsFor(card),teams,'a',['b','c']));
  assert.ok(validatePowerTargets(card,[{teamId:'b',playerIds:['1']},{teamId:'b',playerIds:['2']},{teamId:'c',playerIds:['3']}],teams,'a',['b','c','d']));
});
test('old four-card catalog migrates to 32 without allowing edits to change strength', () => {
  assert.equal(mergePowerCatalog([{id:'captain-double'}]).length,32);
  const card=mergePowerCatalog([{id:'l1',name:'Mi capitán',effect:'c1',rarity:'common',cap:999,active:false}]).find(p=>p.id==='l1');
  assert.equal(card.name,'Mi capitán'); assert.equal(card.effect,'l1'); assert.equal(card.rarity,'legendary'); assert.equal(card.cap,24); assert.equal(card.active,false);
  POWER_ODDS.forEach(odds=>assert.equal(odds.reduce((a,b)=>a+b),100));
});

test('manual off-position starters score x1, retain starter eligibility, and powers use the actual multiplier',()=>{
  const players=['Base','Escolta','Alero','Ala-Pívot','Pívot','Pívot','Base'].map((position,i)=>({id:String(i),position,secondaryPositions:[],positionsVersion:2}));
  const teams=[{id:'own',selectedIds:players.map(p=>p.id),lineupSlots:['4','1','2','3','0','5','6']}];
  const gameStats=players.map(p=>({matchId:1,playerId:p.id,minutes:'20:00',points:10}));
  const advancedStats=players.map(p=>({matchId:1,playerId:p.id,assists:2,oreb:1,dreb:1,steals:1,blocks:1,turnovers:1,fg:'4-6',ft:'2-3'}));
  const base=scorePowerRound({teams,players,gameStats,advancedStats,matchId:1});
  // Each player: 10 points + 6 positive stats - 4 penalties = 12. Only the three compatible starters receive another +6.
  assert.equal(base[0].basePoints,102);
  const own=(id)=>[{powerId:id,targets:[{teamId:'own',playerIds:['4']}]}];
  assert.equal(scorePowerRound({teams,players,gameStats,advancedStats,matchId:1,uses:own('e8')})[0].powerDelta,0);
  assert.equal(scorePowerRound({teams,players,gameStats,advancedStats,matchId:1,uses:own('r3')})[0].powerDelta,1.5);
  assert.equal(scorePowerRound({teams,players,gameStats,advancedStats,matchId:1,uses:own('r7')})[0].powerDelta,-2);
});
