import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CAREER_CONFIG as config } from '../src/data/careerData.js';
import { createCareer, resolveSeason, advanceCareer } from '../src/utils/careerEngine.js';
import { buildCareerShareText, careerShareOptions, CAREER_SHARE_URL } from '../src/utils/careerShare.js';

const completed = () => {
  let career = createCareer({ name: 'Ana & Compañía', number: 7, team: 'femenino', position: 'Base', archetype: 'leader' }, config, () => 0);
  while (career.phase !== 'retired') career = career.phase === 'event' ? resolveSeason(career, false, () => .5) : advanceCareer(career, config.events, () => 0);
  return career;
};

test('resumen compartible con récord, clubes, premios y todos los años opcionales', () => {
  const career = completed(), text = buildCareerShareText(career), detailed = buildCareerShareText(career, true);
  assert(text.includes('Ana & Compañía'));
  assert.match(text, /De los 17 a los 40 años · 24 temporadas/);
  assert(text.includes('Media más alta: ' + career.peakOverall));
  assert.match(text, /premios colectivos/);
  assert.match(text, /La Comunidad del Banquillo/);
  assert(text.endsWith(CAREER_SHARE_URL));
  assert.doesNotMatch(text, /TEMPORADA A TEMPORADA/);
  for (let age = 17; age <= 40; age++) assert(detailed.includes(age + ' años · '));
  assert.equal((detailed.match(/ · Media /g) || []).length, 24);
  assert.doesNotMatch(detailed, /undefined|NaN|localhost/);
});

test('seis canales equivalentes a 18-0 con texto codificado y URL pública', () => {
  const options = careerShareOptions(completed());
  assert.deepEqual(options.map((item) => item.label), ['X / Twitter', 'Facebook', 'Bluesky', 'WhatsApp', 'Telegram', 'Reddit']);
  for (const item of options) {
    const url = new URL(item.href);
    assert.equal(url.protocol, 'https:');
    const values = [...url.searchParams.values()].join(' ');
    assert(values.includes('Ana & Compañía'));
    assert(values.includes(CAREER_SHARE_URL));
    assert.doesNotMatch(item.href, /localhost|user_id|career_id/);
  }
});
