import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CAREER_TROPHIES, groupCareerTrophies, trophyTypeFor } from '../src/utils/careerTrophies.js';

test('los diez trofeos son archivos PNG locales con canal alfa', async () => {
  for (const trophy of Object.values(CAREER_TROPHIES)) {
    const png = await readFile('public' + trophy.image);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png[25], 6);
    assert(png.readUInt32BE(16) >= 256 && png.readUInt32BE(20) >= 256);
  }
});

test('trofeos reconocen premios actuales y antiguos sin confundir títulos personalizados', () => {
  assert.equal(Object.keys(CAREER_TROPHIES).length, 10);
  assert.equal(trophyTypeFor('Copa Interdistritos', 'collective'), 'interdistricts');
  assert.equal(trophyTypeFor('Copa Interdistritos', 'individual'), 'special');
  assert.equal(trophyTypeFor('Campeonato de liga municipal', 'collective'), 'league');
  assert.equal(trophyTypeFor('Campeonato de liga · Junior', 'collective'), 'league');
  for (const type of ['mvp', 'scorer', 'five', 'assists', 'rebounder', 'defender', 'sixth']) {
    assert.equal(trophyTypeFor(CAREER_TROPHIES[type].label + ' · Senior', 'individual'), type);
    assert.equal(trophyTypeFor(CAREER_TROPHIES[type].label, 'individual'), type);
  }
  assert.equal(trophyTypeFor('MVP de la temporada del grupo de amigos', 'individual'), 'special');
  assert.equal(trophyTypeFor('Campeonato de liga municipal', 'individual'), 'special');
});

test('vitrina agrupa repeticiones sin perder temporadas, clubes o nombres históricos', () => {
  const awards = [
    { title: 'Campeonato de liga · Junior', age: 18, club: 'Banquillo' },
    { title: 'Campeonato de liga municipal', age: 25, club: 'Prusia' },
    { title: 'Copa del barrio', age: 26, club: 'Prusia' },
    { title: 'Otro torneo', age: 27, club: 'Banquillo' },
  ];
  const before = structuredClone(awards);
  const groups = groupCareerTrophies(awards, 'collective');
  assert.equal(groups.length, 3);
  assert.equal(groups[0].count, 2);
  assert.deepEqual(groups[0].records, awards.slice(0, 2));
  assert.equal(groups[1].label, 'Copa del barrio');
  assert.equal(groups[2].label, 'Otro torneo');
  assert.deepEqual(awards, before);
  groups[0].records[0].club = 'No mutar';
  assert.deepEqual(awards, before);
  assert.deepEqual(groupCareerTrophies([], 'individual'), []);
});
