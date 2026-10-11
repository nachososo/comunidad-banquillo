// Read-only, literal similarity check. Never imports or executes reference code.
// Usage: node scripts/audit-career-source.mjs /absolute/reference.js /absolute/reference.css
// This is a limited technical check, not a plagiarism or legal certification.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';

const [referenceJsPath, referenceCssPath] = process.argv.slice(2);
if (!referenceJsPath || !referenceCssPath) throw new Error('Pass the downloaded reference JS and CSS paths. No network requests are made.');
const referenceJs = readFileSync(referenceJsPath, 'utf8');
const referenceCss = readFileSync(referenceCssPath, 'utf8');
const hash = (source) => createHash('sha256').update(source).digest('hex');
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const literals = (source) => {
  const result = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'StringLiteral' || node.type === 'JSXText') result.add(normalize(node.value));
    if (node.type === 'TemplateElement') result.add(normalize(node.value.cooked || node.value.raw));
    for (const [key, child] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  };
  visit(parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] }));
  return result;
};
const referenceLiterals = literals(referenceJs);
const files = [
  ...readdirSync('src/components/career').map((file) => 'src/components/career/' + file),
  ...['src/utils', 'src/data', 'src/lib'].flatMap((dir) => readdirSync(dir).filter((name) => /^career.*\.js$/.test(name)).map((name) => dir + '/' + name)),
  'src/pages/CareerPage.jsx', 'src/pages/CareerAdminPage.jsx',
];
const literalMatches = [], blockMatches = [], fingerprints = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  fingerprints.push({ file, sha256: hash(source) });
  if (/\.jsx?$/.test(file)) {
    for (const text of literals(source)) if (text.length >= 35 && referenceLiterals.has(text)) literalMatches.push({ file, text });
  }
  // Exact contiguous windows only: this cannot detect renamed or rewritten code.
  const local = normalize(source), reference = normalize(file.endsWith('.css') ? referenceCss : referenceJs);
  for (let at = 0; at + 160 <= local.length; at += 40) {
    const segment = local.slice(at, at + 160);
    if (reference.includes(segment)) blockMatches.push({ file, offset: at, segment });
  }
}
console.log(JSON.stringify({
  method: 'Normalized exact literals >=35 characters and exact 160-character windows every 40 characters; no semantic or legal analysis.',
  reference: { jsBytes: Buffer.byteLength(referenceJs), cssBytes: Buffer.byteLength(referenceCss), jsSha256: hash(referenceJs), cssSha256: hash(referenceCss) },
  files: fingerprints, literalMatches, blockMatches,
}, null, 2));
