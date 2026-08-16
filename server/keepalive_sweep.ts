// The WebSocket keepalive sweep runs on a fixed interval and terminates any live
// session that did not answer the previous interval's ping. That verdict is only
// sound when the sweep itself ran on time. If the process stalled and the sweep
// fired late, queued pong frames were never processed during the stall, so a
// still-set awaitingPong flag reflects the stall and not a dead client. This factor
// is the stall threshold expressed in whole intervals. Below 1.0x every normal timer
// jitter would read as a stall; at 1.5x a sweep half an interval late means queued
// pongs were never processed, so the termination evidence is void.
//
// Deliberate consequence: while the loop is CHRONICALLY late (every sweep past the
// threshold), reaping is paused entirely, so genuinely dead sockets accumulate and
// their characters answer 'character already in world' until one on-time sweep
// runs. That is the intended trade: a saturated process must not mass-terminate
// every live session on evidence the stall itself manufactured; the dead sockets
// drain one clean interval after the loop recovers.
export const KEEPALIVE_STALL_FACTOR = 1.5;

// True when the gap since the previous sweep exceeds the stall threshold, meaning
// this sweep fired late enough that pong silence is not evidence of a dead client.
export function keepaliveSweepDelayed(
  nowMs: number,
  lastSweepAtMs: number,
  intervalMs: number,
): boolean {
  const elapsed = nowMs - lastSweepAtMs;
  return elapsed > KEEPALIVE_STALL_FACTOR * intervalMs;
}

// The CLIENT-side stall mirror of the sweep-delay rule above. World entry is the
// heaviest client phase: renderer prewarm can block the browser main thread for
// tens of seconds (~89s observed on low-end hardware). A blocked renderer stops
// draining its WebSocket receive pipe; once that pipe and the TCP window fill,
// the server's ping frames sit undelivered behind queued snapshot bytes, so the
// browser's automatic pong never happens — pong silence that reflects a BUSY
// client, not a dead socket. For a session inside this window after join/resume,
// the sweep re-arms instead of terminating (pings still flow, keeping NAT/proxy
// idle timers warm), and the send path tolerates a deeper outbound backlog
// (ws_backpressure.ts entry limit). A genuinely black-holed socket during entry
// is still reaped at most one sweep after the grace expires — well inside the
// 5-minute linkdead grace its character would be held for anyway.
export const WS_ENTRY_GRACE_MS = 180_000;

// True while a session is inside its post-join/post-resume entry grace window.
export function inEntryGrace(nowMs: number, graceUntilMs: number): boolean {
  return nowMs < graceUntilMs;
}
