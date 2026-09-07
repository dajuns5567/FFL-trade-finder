import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const BASELINE = 'e95105e0a062faca352b0fd7f88d0a4bcd45ce69';

const protectedExact = new Set([
  'trade-value-normalization-v139.js',
  'draft-pick-context-v92.js',
  'draft-pick-v86.js',
  'team-context-v90.js',
  'rank-lookup-v58.js',
]);

const indexFunctions = [
  'masterRankings',
  'ensureMaster',
  'playerRankValue',
  'pickValue',
  'baseValue',
  'packageValue',
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function baselineText(path) {
  return git(['show', `${BASELINE}:${path}`]);
}

function listBaselineFiles() {
  return git(['ls-tree', '-r', '--name-only', BASELINE]).trim().split('\n').filter(Boolean);
}

function listCurrentFiles() {
  return git(['ls-files']).trim().split('\n').filter(Boolean);
}

function isProtectedCalculationModule(path) {
  return protectedExact.has(path) || /^valuation[^/]*\.js$/.test(path);
}

function extractTopLevelFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Could not find protected function ${name} in index.html`);

  const brace = source.indexOf('{', start);
  if (brace < 0) throw new Error(`Could not find opening brace for ${name}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = brace; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];

    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not parse protected function ${name}`);
}

const failures = [];
const all = new Set([...listBaselineFiles(), ...listCurrentFiles()]);

for (const path of [...all].filter(isProtectedCalculationModule).sort()) {
  const baselineExists = listBaselineFiles().includes(path);
  const currentExists = existsSync(path);
  if (!baselineExists || !currentExists) {
    failures.push(`${path}: protected calculation module was added/removed relative to frozen baseline`);
    continue;
  }
  const before = baselineText(path);
  const now = readFileSync(path, 'utf8');
  if (before !== now) failures.push(`${path}: protected calculation code differs from frozen baseline`);
}

const baselineIndex = baselineText('index.html');
const currentIndex = readFileSync('index.html', 'utf8');
for (const name of indexFunctions) {
  const before = extractTopLevelFunction(baselineIndex, name);
  const now = extractTopLevelFunction(currentIndex, name);
  if (before !== now) failures.push(`index.html:${name}: protected core value function differs from frozen baseline`);
}

if (failures.length) {
  console.error('\nVALUATION FREEZE VIOLATION\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`\nFrozen baseline: ${BASELINE}`);
  console.error('See VALUATION-FREEZE.md. Change the freeze only after an explicit user request to alter valuation calculations.');
  process.exit(1);
}

console.log(`Valuation calculation freeze verified against ${BASELINE}.`);
console.log('No current player/pick values are stored by this check; only calculation code is protected.');
