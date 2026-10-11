import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

// Static layout contract, not a substitute for a visual browser test.
test('el marco público limita el alto; cuaderno y mensajes desplazan contenido sin esconder botones', async () => {
  const css = postcss.parse(await readFile('src/components/career/career.css', 'utf8'));
  const declarations = (selector) => {
    const values = {};
    css.walkRules((rule) => {
      if (rule.selector !== selector || rule.parent.type !== 'root') return;
      rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
    });
    return values;
  };
  const viewport = declarations('.career-viewport');
  assert.equal(viewport.height, '100dvh');
  assert.equal(viewport['min-height'], '0');
  assert.equal(viewport['grid-template-rows'], 'auto minmax(0,1fr)');
  assert.equal(viewport.overflow, 'hidden');
  assert.equal(declarations('.career-viewport .career-notebook-scroll').overflow, 'auto');
  assert.equal(declarations('.career-viewport .career-notebook-scroll .career-table-scroll')['max-height'], 'none');
  assert.equal(declarations('.career-viewport .career-event-chat > .career-group-messages').overflow, 'auto');
  assert.equal(declarations('.career-viewport .career-live-content').overflow, 'auto');
  assert.equal(declarations('.career-viewport .career-live-decisions')['flex-shrink'], '0');
  const layout = await readFile('src/components/career/CareerLayout.jsx', 'utf8');
  assert.match(layout, /!admin \? ' career-viewport'/);
  assert.match(layout, /admin \? children : <div className="career-stage">/);
  assert.match(layout, /admin && <Footer/);
  assert.doesNotMatch(css.toString(), /(?:^|\})\s*(?:html|body|#root)\s*\{[^}]*overflow\s*:\s*hidden/);
});
