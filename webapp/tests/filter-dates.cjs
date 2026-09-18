const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForDates = {};
const code = ts.transpileModule(fs.readFileSync('src/components/filters/dates.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, { exports: exportsForDates, Date });
const { dateRangePresets, overlapsDateRange } = exportsForDates;

test('quick date choices include today and cross year boundaries correctly', () => {
  const presets = dateRangePresets(new Date(2026, 11, 31, 23, 30));
  assert.equal(presets.find(p => p.label === 'Any time').value, '');
  assert.equal(presets.find(p => p.label === 'Today').value, '2026-12-31|2026-12-31');
  assert.equal(presets.find(p => p.label === 'Tomorrow').value, '2027-01-01|2027-01-01');
  assert.equal(presets.find(p => p.label === 'Next 7 days').value, '2026-12-31|2027-01-06');
  assert.equal(presets.find(p => p.label === 'Next 30 days').value, '2026-12-31|2027-01-29');
});

test('calendar ranges include leap day', () => {
  const presets = dateRangePresets(new Date(2028, 1, 28));
  assert.equal(presets.find(p => p.label === 'Tomorrow').value, '2028-02-29|2028-02-29');
  assert.equal(presets.find(p => p.label === 'Next 7 days').value, '2028-02-28|2028-03-05');
});

test('preset filtering includes both boundary days and excludes the following day', () => {
  const range = dateRangePresets(new Date(2026, 8, 18)).find(p => p.label === 'Next 7 days').value;
  assert.equal(overlapsDateRange(null, '2026-09-18T00:00:00', range), true);
  assert.equal(overlapsDateRange('2026-09-24T23:59:59', null, range), true);
  assert.equal(overlapsDateRange('2026-09-25T00:00:00', null, range), false);
  assert.equal(overlapsDateRange(null, '2026-09-17T23:59:59', range), false);
  assert.equal(overlapsDateRange(null, null, ''), true);
});
