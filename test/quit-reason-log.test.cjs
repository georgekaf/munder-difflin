/**
 * Every way out of the app leaves an `app-quit` line in log.jsonl, with the path that fired.
 *
 * The gap: log.jsonl had `app-start` and no counterpart. Seen 2026-10-15: the app went
 * down in an orderly teardown at 11:13:44 with three agents mid-run (one of them waiting
 * to start the next pipeline packet), and nothing recorded whether it was the quit
 * dialog, closing time, or the last window closing. The dev console that might have
 * said so was a minimized `cmd /c npm run dev` window, gone with the app.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const src = readFileSync(join(__dirname, '..', 'src/main/index.ts'), 'utf8');

function body(signature) {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, `index.ts must contain ${signature}`);
  return src.slice(start, src.indexOf('\n}', start));
}

test('logQuit writes one app-quit event with its reason', () => {
  const fn = body('function logQuit(reason: string): void {');
  assert.match(fn, /kind: 'app-quit'/);
  assert.match(fn, /reason/);
});

test('teardownAndQuit logs its reason before tearing anything down', () => {
  const fn = body('function teardownAndQuit(reason: string): void {');
  const first = fn.split('\n').slice(1).find((l) => l.trim() && !l.trim().startsWith('//'));
  assert.match(first, /^\s*logQuit\(reason\);/, 'the log line must come before the hive and PTYs go');
});

test('every teardownAndQuit caller names its path', () => {
  const calls = [...src.matchAll(/teardownAndQuit\(([^)]*)\)/g)].map((m) => m[1])
    .filter((arg) => arg !== 'reason: string');
  assert.ok(calls.length >= 3, `expected the dialog, closing-time and window-all-closed callers, got ${calls.length}`);
  for (const arg of calls) assert.match(arg, /^'[a-z-]+'$/, `teardownAndQuit(${arg}) needs a literal reason`);
});

test('will-quit catches a quit no teardown logged (updater, OS)', () => {
  const start = src.indexOf("app.on('will-quit'");
  assert.ok(start >= 0);
  assert.match(src.slice(start, start + 400), /logQuit\('/);
});

test('the change-home relaunch logs before it exits', () => {
  const start = src.indexOf('// Repoint config and relaunch');
  assert.ok(start >= 0);
  const block = src.slice(start, src.indexOf('app.exit(0);', start));
  assert.match(block, /logQuit\('/);
});
