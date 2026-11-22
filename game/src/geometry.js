// Geometry helpers: rectangles, circles and line of sight. The stealth rules (can a
// guard see the thief around this wall?) all reduce to these few pure functions.

/** True when the point is inside the rectangle (edges count as inside). */
export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** True when the circle overlaps the rectangle. */
export function circleHitsRect(x, y, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

/**
 * Push a circle out of a rectangle it overlaps, along the smallest axis. Returns
 * true when it moved the circle. Used axis by axis, so sliding along a wall works.
 */
export function resolveCircleRect(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  let dx = circle.x - nearestX;
  let dy = circle.y - nearestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= circle.radius * circle.radius) return false;
  if (distSq === 0) {
    // Centre inside the rectangle: push out along the shallowest side.
    const left = circle.x - rect.x;
    const right = rect.x + rect.w - circle.x;
    const top = circle.y - rect.y;
    const bottom = rect.y + rect.h - circle.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) circle.x = rect.x - circle.radius;
    else if (min === right) circle.x = rect.x + rect.w + circle.radius;
    else if (min === top) circle.y = rect.y - circle.radius;
    else circle.y = rect.y + rect.h + circle.radius;
    return true;
  }
  const dist = Math.sqrt(distSq);
  dx /= dist;
  dy /= dist;
  circle.x = nearestX + dx * circle.radius;
  circle.y = nearestY + dy * circle.radius;
  return true;
}

/** Distance between two points. */
export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Smallest absolute angle between two headings, in radians (0..PI). */
export function angleDifference(a, b) {
  let diff = (a - b) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const rX = bx - ax;
  const rY = by - ay;
  const sX = dx - cx;
  const sY = dy - cy;
  const denom = rX * sY - rY * sX;
  if (denom === 0) return false;
  const t = ((cx - ax) * sY - (cy - ay) * sX) / denom;
  const u = ((cx - ax) * rY - (cy - ay) * rX) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** True when the segment from (ax, ay) to (bx, by) touches the rectangle. */
export function segmentHitsRect(ax, ay, bx, by, rect) {
  if (pointInRect(ax, ay, rect) || pointInRect(bx, by, rect)) return true;
  const x2 = rect.x + rect.w;
  const y2 = rect.y + rect.h;
  return (
    segmentsCross(ax, ay, bx, by, rect.x, rect.y, x2, rect.y) ||
    segmentsCross(ax, ay, bx, by, x2, rect.y, x2, y2) ||
    segmentsCross(ax, ay, bx, by, x2, y2, rect.x, y2) ||
    segmentsCross(ax, ay, bx, by, rect.x, y2, rect.x, rect.y)
  );
}

/**
 * True when any rectangle in `blockers` cuts the line of sight between two points.
 * Walls and display cases block sight; bushes do not (they hide, not block).
 */
export function lineBlocked(ax, ay, bx, by, blockers) {
  for (let index = 0; index < blockers.length; index += 1) {
    if (segmentHitsRect(ax, ay, bx, by, blockers[index])) return true;
  }
  return false;
}
