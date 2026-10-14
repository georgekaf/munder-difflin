/**
 * A second instance must not boot.
 *
 * The bug: a `munderdifflin://` deep link starts a second process. It loses the
 * single-instance lock and calls `app.quit()`, but quit is asynchronous, so
 * `whenReady` still fires and the WHOLE boot runs: it logs app-start, runs
 * archiveOrphanedAgents (which sees none of the first instance's PTYs and
 * archives every live agent), and fights the first instance for the hook pipe.
 * Seen 2026-10-14: one hire link archived six agents whose terminals were alive.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const src = readFileSync(join(__dirname, '..', 'src/main/index.ts'), 'utf8');

test('the boot handler returns before doing anything when the lock was lost', () => {
  const start = src.indexOf('app.whenReady().then(() => {');
  assert.ok(start >= 0, 'index.ts must boot from app.whenReady()');
  const body = src.slice(start).split('\n').slice(1);
  const first = body.find((l) => l.trim() && !l.trim().startsWith('//'));
  assert.match(first, /^\s*if \(!gotInstanceLock\) return;/,
    'the first statement of the boot must bail out in a second instance');
});
