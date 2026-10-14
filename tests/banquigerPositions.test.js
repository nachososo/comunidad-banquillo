import test from 'node:test';
import assert from 'node:assert/strict';
import { BANQUIGER_POSITIONS, buildBanquigerLineup, getBanquigerPositions, canAddBanquigerPlayer, moveBanquigerPlayer, reconcileBanquigerSlots } from '../src/utils/banquigerPositions.js';
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
test('seven players sharing the same positions can now complete the team',()=>{
  const team=Array.from({length:7},(_,i)=>player(String(i),'Base',['Escolta']));
  assert.equal(buildBanquigerLineup(team).starterPlayers.length,5);
  assert.equal(canAddBanquigerPlayer(team.slice(0,2),team[2]),true);
});

test('manual slots swap starters and reserves, keep off-position roles, and survive roster changes',()=>{
  const team=BANQUIGER_POSITIONS.map((position,i)=>player(String(i),position));
  team.push(player('5','Pívot'),player('6','Base'));
  const initial=buildBanquigerLineup(team).slots;
  const moved=moveBanquigerPlayer(initial,0,4);
  const lineup=buildBanquigerLineup(team,moved);
  assert.equal(lineup.startersByPosition.Base.id,'4');
  assert.equal(lineup.startersByPosition.Base.inPosition,false);
  const benched=moveBanquigerPlayer(moved,4,5);
  assert.equal(buildPowerLineup(team.map(p=>p.id),team,benched).find(p=>p.id==='0').starter,false);
  assert.deepEqual(reconcileBanquigerSlots(team,benched),benched);
  assert.equal(new Set(benched).size,7);
  const removed=reconcileBanquigerSlots(team.filter(p=>p.id!=='0'),benched);
  assert.equal(removed[5],null);
});
