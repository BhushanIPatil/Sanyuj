const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../src/app/(admin)/requests/servingStatus.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loaded = { exports: {} };
new Function("exports", compiled.outputText)(loaded.exports);
const { servingStatus } = loaded.exports;
const now = Date.parse("2026-09-26T12:00:00Z");
const content = { id: "test", title: "Test", starts_at: null, ends_at: null, is_active: true, is_deleted: false };

test("serving window uses inclusive start and exclusive end", () => {
  assert.equal(servingStatus({ ...content, starts_at: "2026-09-26T12:00:01Z" }, now), "Upcoming");
  assert.equal(servingStatus({ ...content, starts_at: "2026-09-26T17:30:00+05:30" }, now), "Currently serving");
  assert.equal(servingStatus({ ...content, ends_at: "2026-09-26T12:00:01Z" }, now), "Currently serving");
  assert.equal(servingStatus({ ...content, ends_at: "2026-09-26T12:00:00Z" }, now), "Expired");
  assert.equal(servingStatus({ ...content, ends_at: "2026-09-25T12:00:00Z" }, now), "Expired");
});

test("unbounded windows and content availability", () => {
  assert.equal(servingStatus(content, now), "Currently serving");
  assert.equal(servingStatus(null, now), "Not linked");
  assert.equal(servingStatus({ ...content, is_active: false }, now), "Inactive");
  assert.equal(servingStatus({ ...content, is_deleted: true }, now), "Deleted");
});
