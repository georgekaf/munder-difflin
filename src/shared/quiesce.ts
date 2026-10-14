/** PTY-quiescence idle fallback (#2e): a 'working' agent whose PTY has printed nothing for
 *  this long is treated as turn-done, for bridges that never send their turn-end signal. */
export const QUIESCE_IDLE_MS = 12000;

/** How long a hook event newer than the PTY's last output keeps an agent's status. Such an
 *  agent is driven from OUTSIDE its terminal (a pipeline avatar: an idle CLI on the floor, its
 *  hook events sent by a worker process elsewhere), so PTY silence says nothing about it. The
 *  ceiling keeps a lost Stop from pinning it 'working' forever. */
export const EXTERNAL_HOLD_MS = 30 * 60_000;

/** Should a 'working' agent be flipped idle? `lastPtyOutputAt` is its PTY's last byte,
 *  `lastHookAt` its last hook event (undefined when none arrived this session). */
export function shouldQuiesce(now: number, lastPtyOutputAt: number | undefined, lastHookAt: number | undefined): boolean {
  if (typeof lastPtyOutputAt !== 'number' || lastPtyOutputAt <= 0) return false;
  if (now - lastPtyOutputAt <= QUIESCE_IDLE_MS) return false;
  if (typeof lastHookAt === 'number' && lastHookAt > lastPtyOutputAt && now - lastHookAt < EXTERNAL_HOLD_MS) return false;
  return true;
}
