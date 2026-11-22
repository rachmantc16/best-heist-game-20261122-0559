// Wall cameras: fixed mounts whose cones sweep back and forth across the floor. A
// camera sees the thief the same way a guard does — inside the cone, in range, with a
// clear line of sight — unless the jammer has blinded it.
import { CAMERA, GUARD } from './config.js';
import { angleDifference, distance, lineBlocked } from './geometry.js';

export function createCameras() {
  return [
    {
      name: 'Cam A',
      x: 560, y: 300, baseAngle: Math.PI / 2,
      angle: Math.PI / 2, sweepPhase: 0, jammed: false,
    },
    {
      name: 'Cam B',
      x: 672, y: 212, baseAngle: Math.PI,
      angle: Math.PI, sweepPhase: 1.7, jammed: false,
    },
  ];
}

/** True when this camera can see the thief right now. */
export function cameraSees(camera, thief, hidden, blockers) {
  if (camera.jammed) return false;
  const range = CAMERA.sightRange * (thief.sneaking ? 0.7 : 1);
  const dist = distance(camera.x, camera.y, thief.x, thief.y);
  if (dist > range) return false;
  if (hidden && dist > GUARD.bushRevealRadius) return false;
  const angleToThief = Math.atan2(thief.y - camera.y, thief.x - camera.x);
  if (angleDifference(camera.angle, angleToThief) > CAMERA.sightHalfAngle) return false;
  return !lineBlocked(camera.x, camera.y, thief.x, thief.y, blockers);
}

/**
 * Advance every camera one step: sweep the cone, apply the jammer, test sight.
 * Returns { seen } — whether any camera sees the thief.
 */
export function updateCameras(cameras, dt, ctx) {
  let seen = false;
  for (const camera of cameras) {
    camera.jammed = ctx.jammed;
    camera.sweepPhase += dt * CAMERA.sweepSpeed;
    camera.angle = camera.baseAngle + Math.sin(camera.sweepPhase) * CAMERA.sweepArc;
    if (cameraSees(camera, ctx.thief, ctx.hidden, ctx.blockers)) seen = true;
  }
  return { seen };
}
