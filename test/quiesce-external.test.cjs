/**
 * An agent driven from outside its own terminal must not be quiesced to idle.
 *
 * The quiescence fallback flips a 'working' agent idle once its PTY has printed nothing
 * for 12 s - right for a bridge that never sends its turn-end signal, wrong for an agent
 * whose hook events come from work running ELSEWHERE (a pipeline avatar: its terminal is an
 * idle CLI, while a worker process sends PreToolUse/Stop for it). Seen 2026-10-14: the worker
 * avatar showed for ~12 s after each tool call and wandered through every multi-minute test
 * run, so the floor looked empty while the pipeline worked.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { shouldQuiesce, QUIESCE_IDLE_MS, EXTERNAL_HOLD_MS } = loadTs('src/shared/quiesce.ts');

const now = 10_000_000;

test('a quiet PTY with no newer hook event still goes idle (the bridge case)', () => {
  assert.equal(shouldQuiesce(now, now - QUIESCE_IDLE_MS - 1, undefined), true);
  assert.equal(shouldQuiesce(now, now - QUIESCE_IDLE_MS - 1, now - QUIESCE_IDLE_MS - 5), true);
});

test('a PTY that printed recently is never quiesced', () => {
  assert.equal(shouldQuiesce(now, now - 1000, undefined), false);
});

test('a hook event newer than the last PTY output holds the status: the work is elsewhere', () => {
  assert.equal(shouldQuiesce(now, now - 600_000, now - 300_000), false);
});

test('the hold has a ceiling, so a lost Stop cannot pin an agent working forever', () => {
  assert.equal(shouldQuiesce(now, now - EXTERNAL_HOLD_MS - 10, now - EXTERNAL_HOLD_MS - 1), true);
});

test('no PTY reading yet means nothing to judge', () => {
  assert.equal(shouldQuiesce(now, undefined, undefined), false);
  assert.equal(shouldQuiesce(now, 0, undefined), false);
});
