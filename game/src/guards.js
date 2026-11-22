// Guards: the patrols the thief has to read before moving. Each guard walks a fixed
// route, pauses at each waypoint to sweep its cone, investigates a thrown coin, and
// chases the thief's last seen position once the alarm runs high. A guard sees the
// thief when the thief is inside its cone, in range, with a clear line of sight —
// unless the thief is hiding in a bush and the guard is not right on top of them.
import { ALARM, GUARD } from './config.js';
import { angleDifference, distance, lineBlocked, resolveCircleRect } from './geometry.js';

const PATROL_PAUSE = 0.9;
const SCAN_SWING = 0.75;
const TURN_SPEED = 3.5;

export function createGuards() {
  return [
    {
      name: 'Rook',
      x: 120, y: 240, angle: 0, radius: GUARD.radius,
      waypoints: [{ x: 120, y: 240 }, { x: 540, y: 240 }],
      wpIndex: 1, wait: 0, scanPhase: 0, baseAngle: 0,
      mode: 'patrol', investigateTimer: 0, targetX: 0, targetY: 0, chaseWait: 0,
    },
    {
      name: 'Bishop',
      x: 620, y: 260, angle: Math.PI / 2, radius: GUARD.radius,
      waypoints: [{ x: 620, y: 260 }, { x: 620, y: 560 }],
      wpIndex: 1, wait: 0, scanPhase: 2.1, baseAngle: Math.PI / 2,
      mode: 'patrol', investigateTimer: 0, targetX: 0, targetY: 0, chaseWait: 0,
    },
    {
      name: 'Knight',
      x: 120, y: 170, angle: 0, radius: GUARD.radius,
      waypoints: [{ x: 120, y: 170 }, { x: 540, y: 170 }],
      wpIndex: 1, wait: 0, scanPhase: 4.2, baseAngle: 0,
      mode: 'patrol', investigateTimer: 0, targetX: 0, targetY: 0, chaseWait: 0,
    },
  ];
}

/** Turn `angle` toward `target` by at most `maxStep` radians. */
function turnToward(angle, target, maxStep) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return angle + Math.sign(diff) * maxStep;
}

/** Walk toward (tx, ty) at `speed`, sliding along walls and cases. Returns arrival. */
function walkToward(guard, tx, ty, speed, dt, blockers) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  for (const rect of blockers) resolveCircleRect(guard, rect);
  guard.x = Math.max(24 + GUARD.radius, Math.min(936 - GUARD.radius, guard.x));
  guard.y = Math.max(24 + GUARD.radius, Math.min(616 - GUARD.radius, guard.y));
  guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), TURN_SPEED * dt);
  return dist - step < 6;
}

/** True when this guard can see the thief right now. */
export function guardSees(guard, thief, hidden, blockers) {
  const range = GUARD.sightRange * (thief.sneaking ? 0.7 : 1);
  const dist = distance(guard.x, guard.y, thief.x, thief.y);
  if (dist > range) return false;
  if (hidden && dist > GUARD.bushRevealRadius) return false;
  const angleToThief = Math.atan2(thief.y - guard.y, thief.x - guard.x);
  if (angleDifference(guard.angle, angleToThief) > GUARD.sightHalfAngle) return false;
  return !lineBlocked(guard.x, guard.y, thief.x, thief.y, blockers);
}

/**
 * Advance every guard one step. `ctx` carries the level's blockers, the thief, whether
 * the thief is hidden, the alarm level, the thrown coin and the last seen position.
 * Returns { seen } — whether any guard sees the thief.
 */
export function updateGuards(guards, dt, ctx) {
  let seen = false;
  // When the alarm runs high, only the guard nearest the last seen position gives
  // chase; the others hold their patrols, so a chase stays escapable.
  let chaser = null;
  if (ctx.alarm > ALARM.chaseThreshold && ctx.lastSeen) {
    let nearest = Infinity;
    for (const guard of guards) {
      if (guard.mode === 'investigate') continue;
      const dist = distance(guard.x, guard.y, ctx.lastSeen.x, ctx.lastSeen.y);
      if (dist < nearest) {
        nearest = dist;
        chaser = guard;
      }
    }
  }
  for (const guard of guards) {
    // A live coin pulls the nearest patrolling guard over to look at it.
    if (ctx.coin.active && guard.mode === 'patrol') {
      const coinDist = distance(guard.x, guard.y, ctx.coin.x, ctx.coin.y);
      let nearest = true;
      for (const other of guards) {
        if (other !== guard && other.mode === 'patrol' && distance(other.x, other.y, ctx.coin.x, ctx.coin.y) < coinDist) {
          nearest = false;
          break;
        }
      }
      if (nearest) {
        guard.mode = 'investigate';
        guard.targetX = ctx.coin.x;
        guard.targetY = ctx.coin.y;
        guard.investigateTimer = ctx.coin.timer;
      }
    }

    if (guard.mode === 'investigate') {
      if (walkToward(guard, guard.targetX, guard.targetY, GUARD.investigateSpeed, dt, ctx.blockers)) {
        guard.investigateTimer -= dt;
        guard.scanPhase += dt;
        guard.angle = guard.baseAngle + Math.sin(guard.scanPhase * 1.4) * SCAN_SWING;
        if (guard.investigateTimer <= 0 || !ctx.coin.active) guard.mode = 'patrol';
      }
    } else if (guard === chaser) {
      // The alarm is high: the nearest guard chases where the thief was last seen.
      guard.mode = 'chase';
      if (walkToward(guard, ctx.lastSeen.x, ctx.lastSeen.y, GUARD.chaseSpeed, dt, ctx.blockers)) {
        guard.chaseWait += dt;
        guard.scanPhase += dt;
        guard.angle = guard.baseAngle + Math.sin(guard.scanPhase * 1.4) * SCAN_SWING;
        if (guard.chaseWait > 1.2) {
          guard.mode = 'patrol';
          guard.chaseWait = 0;
        }
      }
    } else {
      if (guard.mode !== 'patrol') guard.mode = 'patrol';
      if (guard.wait > 0) {
        // Paused at a waypoint: sweep the cone across the room.
        guard.wait -= dt;
        guard.scanPhase += dt;
        guard.angle = guard.baseAngle + Math.sin(guard.scanPhase * 1.2) * SCAN_SWING;
      } else {
        const target = guard.waypoints[guard.wpIndex];
        if (walkToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, ctx.blockers)) {
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          const next = guard.waypoints[guard.wpIndex];
          guard.baseAngle = Math.atan2(next.y - guard.y, next.x - guard.x);
          guard.wait = PATROL_PAUSE;
        }
      }
    }

    if (guardSees(guard, ctx.thief, ctx.hidden, ctx.blockers)) seen = true;
  }
  return { seen };
}
