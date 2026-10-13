import test from 'node:test';
import assert from 'node:assert/strict';
import { BANQUIGER_POSITIONS, buildBanquigerLineup, getBanquigerPositions, canAddBanquigerPlayer } from '../src/utils/banquigerPositions.js';
import { buildPowerLineup } from '../src/utils/banquigerPowers.js';
const player=(id,position,secondaryPositions=[])=>({id,position,secondaryPositions,positionsVersion:2});
test('defaults match the five agreed pairs; explicit single positions remain editable',()=>{
  assert.deepEqual(BANQUIGER_POSITIONS.map(position=>getBanquigerPositions({position})[1]),['Escolta','Base','Escolta','Pívot','Ala-Pívot']);
  assert.deepEqual(getBanquigerPositions(player('1','Base')),['Base']);
  assert.deepEqual(getBanquigerPositions(player('1','Base',['Base','Escolta'])),['Base','Escolta']);
});
test('covers base and pivot without any player whose primary position is base or pivot',()=>{
  const team=[player('1','Escolta',['Base']),player('2','Escolta',['Base']),player('3','Alero',['Escolta']),player('4','Ala-Pívot',['Pívot']),player('5','Ala-Pívot',['Pívot']),player('6','Alero',['Escolta']),player('7','Escolta',['Base'])];
  const lineup=buildBanquigerLineup(team);
  assert.equal(lineup.starterPlayers.length,5); assert.equal(lineup.benchPlayers.length,2);
  assert.equal(new Set(lineup.starterPlayers.map(p=>p.id)).size,5);
  assert.equal(lineup.startersByPosition.Base.position,'Escolta'); assert.equal(lineup.startersByPosition['Pívot'].position,'Ala-Pívot');
  assert.deepEqual(buildPowerLineup(team.map(p=>p.id),team).filter(p=>p.starter).map(p=>p.id).sort(),lineup.starterPlayers.map(p=>p.id).sort());
});
test('reassigns a versatile player to avoid greedy dead ends',()=>{
  const team=[player('1','Base',['Escolta']),player('2','Base'),player('3','Alero'),player('4','Ala-Pívot'),player('5','Pívot')];
  const lineup=buildBanquigerLineup(team);
  assert.equal(lineup.startersByPosition.Base.id,'2'); assert.equal(lineup.startersByPosition.Escolta.id,'1');
  assert.ok(canAddBanquigerPlayer([team[0]],team[1]));
});
test('prefers primary positions, retains existing full lineups and never fills two slots with one player',()=>{
  const team=BANQUIGER_POSITIONS.map((position,i)=>({id:String(i),position}));
  const lineup=buildBanquigerLineup([...team,{id:'bench',position:'Base'}]);
  assert.deepEqual(lineup.starterPlayers.map(p=>p.id),team.map(p=>p.id));
  assert.equal(lineup.benchPlayers[0].id,'bench');
  assert.equal(buildBanquigerLineup([team[0]]).starterPlayers.length,1);
  assert.equal(buildBanquigerLineup([]).starterPlayers.length,0);
});
test('incompatible seven-player rosters stay incomplete',()=>{
  const team=Array.from({length:7},(_,i)=>player(String(i),'Base',['Escolta']));
  assert.equal(buildBanquigerLineup(team).starterPlayers.length,2);
  assert.equal(canAddBanquigerPlayer(team.slice(0,2),team[2]),false);
});
