const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../components/inbox/v2/table-sizing.ts'), 'utf8');
const output = {};
vm.runInNewContext('(function(exports){' + ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}}).outputText + '\n})', {})(output);
const {COLUMN_SIZES: rules, SELECT_WIDTH, ACTIONS_WIDTH, sizeColumns, readWidths} = output;
// Both fixed bookends — the checkbox and the kebab — sit outside the distribution.
const FIXED = SELECT_WIDTH + ACTIONS_WIDTH;
const columns = Object.keys(rules);
const plain = value => JSON.parse(JSON.stringify(value));
// Exercise every visibility combination through narrow, normal, and wide containers.
for (let mask = 1; mask < 2 ** columns.length; mask++) {
  const shown = columns.filter((_, i) => mask & (1 << i));
  const min = shown.reduce((s,c) => s + rules[c].min, 0);
  const max = shown.reduce((s,c) => s + rules[c].max, 0);
  for (const available of [320, 768, 1024, 1240, 1440, 1920, 2560, 4000]) {
    const sizes = sizeColumns(shown, available, {});
    for (const c of shown) assert(sizes[c] >= rules[c].min && sizes[c] <= rules[c].max, `${c} is readable and bounded`);
    assert.equal(Object.values(sizes).reduce((a,b)=>a+b,0), Math.max(min, Math.min(max, available - FIXED)), 'no rounding overflow or unallocated fit space');
  }
}
const snapshot = sizeColumns(columns, 1920, {});
const manual = {...snapshot, File: snapshot.File + 50};
for (const available of [320, 1240, 2560]) assert.deepEqual(plain(sizeColumns(columns, available, manual)), plain(manual), 'viewport changes do not rescale manual widths');
const hidden = sizeColumns(columns.filter(c=>c!=='Source'), 1920, manual);
assert.equal(hidden.File, manual.File);
assert.equal(sizeColumns(columns, 1920, manual).Source, manual.Source, 'showing restores the hidden width');
assert.deepEqual(plain(readWidths({File:-10, Amount:9999, Source:'200', Vendor:NaN, Unknown:100})), {File:rules.File.min, Amount:rules.Amount.max});
assert.deepEqual(plain(readWidths(null)), {});
assert.deepEqual(plain(readWidths([])), {});
assert.deepEqual(plain(sizeColumns([], 1200, {})), {});
assert.deepEqual(plain(sizeColumns(columns, 1920, {})), plain(snapshot), 'reset returns to automatic layout');
console.log('PASS: all 511 visibility combinations, 8 viewport widths, manual stability, hide/show restoration, limits, invalid storage, and reset.');
