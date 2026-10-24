import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePlayerMatchStats, getPlayerSeasonOptions, summarizePlayerSeason, playerCaptureMinutes, hasRecordedGameAppearance } from '../src/utils/playerSeasonStats.js';
test('preserves history and replaces remote match IDs', () => {
 assert.deepEqual(mergePlayerMatchStats([{matchId:1,points:5},{matchId:2,points:6}],[{matchId:'2',points:9},{matchId:22,points:10}]).map(row=>row.points),[5,9,10]);
});
test('discovers current and historic seasons per team', () => {
 assert.deepEqual(getPlayerSeasonOptions([{team:'masculine',season:'2026-2027'},{team:'feminine',season:'2028-2029'}],[{match:{season:'2025/2026'}}],'masculine'),['2026-2027','2025-2026']);
});
test('unknown minutes keep scoring averages, explicit DNP is excluded, minutes are never invented', () => {
 const s=summarizePlayerSeason([{minutes:null,points:8},{minutes:'12:00',points:10},{minutes:'00:00',points:0}]);
 assert.equal(s.playedGames.length,2); assert.equal(s.totalPoints,18); assert.equal(s.averagePoints,'9.0'); assert.equal(s.averageMinutes,'12:00');
 assert.equal(summarizePlayerSeason([{minutes:null,points:8}]).averageMinutes,'-');
 assert.equal(summarizePlayerSeason([{minutes:'10:30'},{minutes:'11:00'}]).averageMinutes,'10:45');
 assert.equal(summarizePlayerSeason([]).averageMinutes,'-');
});
test('zero-stat participants differ from unused reserves', () => {
 assert.equal(playerCaptureMinutes(1,['1'],[]),null);
 assert.equal(playerCaptureMinutes(2,['1'],[{teamSide:'own',playerId:2}]),null);
 assert.equal(playerCaptureMinutes(3,['1'],[{teamSide:'rival',playerId:3}]),'00:00');
});
test('Banquiger distinguishes untimed participants from DNP', () => {
 assert.equal(hasRecordedGameAppearance({minutes:null,points:8}),true);
 assert.equal(hasRecordedGameAppearance({minutes:'00:00'}),false);
 assert.equal(hasRecordedGameAppearance(undefined),false);
 assert.equal(hasRecordedGameAppearance({minutes:'-'}),false);
});
