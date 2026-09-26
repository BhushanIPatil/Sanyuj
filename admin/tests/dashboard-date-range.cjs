const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/app/(admin)/dashboard/dateRange.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loaded = { exports: {} };
new Function('exports', compiled.outputText)(loaded.exports);
const { dateRange } = loaded.exports;
const iso = (year, month, day) => new Date(year, month - 1, day).toISOString();
function check(period, now, start, end) {
  assert.deepEqual(dateRange(period, '', '', now), { start: iso(...start), end: iso(...end) });
}
test('today uses local midnight and an exclusive next-day boundary', () => {
  check('today', new Date(2026, 8, 26, 18, 30), [2026, 9, 26], [2026, 9, 27]);
});
test('weeks start Monday, including Sundays and year crossings', () => {
  check('week', new Date(2026, 8, 27), [2026, 9, 21], [2026, 9, 28]);
  check('week', new Date(2026, 8, 28), [2026, 9, 28], [2026, 10, 5]);
  check('week', new Date(2026, 0, 1), [2025, 12, 29], [2026, 1, 5]);
});
test('month and year handle leap years and December', () => {
  check('month', new Date(2024, 1, 15), [2024, 2, 1], [2024, 3, 1]);
  check('month', new Date(2026, 11, 31), [2026, 12, 1], [2027, 1, 1]);
  check('year', new Date(2026, 8, 26), [2026, 1, 1], [2027, 1, 1]);
});
test('custom includes both dates and rejects incomplete or invalid ranges', () => {
  assert.deepEqual(dateRange('custom', '2026-09-26', '2026-09-26'), { start: iso(2026, 9, 26), end: iso(2026, 9, 27) });
  assert.deepEqual(dateRange('custom', '2026-09-01', '2026-09-30'), { start: iso(2026, 9, 1), end: iso(2026, 10, 1) });
  for (const [from, to] of [['', ''], ['2026-09-27', '2026-09-26'], ['2026-02-30', '2026-03-01'], ['invalid', '2026-09-26']]) {
    assert.equal(dateRange('custom', from, to), null);
  }
});
test('calendar-day calculation remains correct across daylight-saving transitions', () => {
  const original = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const range = dateRange('custom', '2026-03-08', '2026-03-08');
    assert.equal(new Date(range.end) - new Date(range.start), 23 * 60 * 60 * 1000);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
