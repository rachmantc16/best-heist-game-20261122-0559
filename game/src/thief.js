// The thief: movement, the two tools, and picking up loot. Movement is axis-separated
// so the thief slides along walls instead of sticking to them. Tools cost loot: a coin
// thrown to pull a guard away, a jammer that blinds the cameras for a few seconds.
import { LOOT, THIEF, TOOLS } from './config.js';
import { distance, resolveCircleRect } from './geometry.js';
import { EVENT_GEM, EVENT_VAULT } from './world.js';

/**
 * Move the thief one step from the normalized input { dx, dy, sneak }. Sneaking is
 * slower but harder to spot. Walls and display cases block; bushes do not.
 */
export function moveThief(thief, input, dt, level) {
  const speed = input.sneak ? THIEF.sneakSpeed : THIEF.speed;
  const len = Math.hypot(input.dx, input.dy);
  thief.sneaking = input.sneak;
  thief.moving = len > 0;
  if (len === 0) return;
  const nx = input.dx / len;
  const ny = input.dy / len;
  thief.angle = Math.atan2(ny, nx);
  thief.x += nx * speed * dt;
  for (const rect of level.blockers) resolveCircleRect(thief, rect);
  thief.y += ny * speed * dt;
  for (const rect of level.blockers) resolveCircleRect(thief, rect);
  thief.x = Math.max(24 + thief.radius, Math.min(936 - thief.radius, thief.x));
  thief.y = Math.max(24 + thief.radius, Math.min(616 - thief.radius, thief.y));
}

/**
 * Throw a decoy coin at (x, y): the nearest guard walks over to investigate it.
 * Costs loot and only reaches so far. Returns true when the coin was thrown.
 */
export function throwCoin(state, x, y) {
  if (state.loot < TOOLS.coin.cost) return false;
  if (distance(state.thief.x, state.thief.y, x, y) > TOOLS.coin.range) return false;
  state.loot -= TOOLS.coin.cost;
  state.coin.x = x;
  state.coin.y = y;
  state.coin.timer = TOOLS.coin.investigateSeconds;
  state.coin.active = true;
  return true;
}

/** Blind every camera for a few seconds. Costs loot. Returns true when it fired. */
export function jamCameras(state) {
  if (state.loot < TOOLS.jammer.cost || state.jamTimer > 0) return false;
  state.loot -= TOOLS.jammer.cost;
  state.jamTimer = TOOLS.jammer.jamSeconds;
  return true;
}

/**
 * Pick up any gem the thief touches and the vault's Star Sapphire. Adds the value to
 * the loot and returns the matching event flags.
 */
export function collectLoot(state, level) {
  let events = 0;
  for (const gem of state.gems) {
    if (!gem.taken && distance(state.thief.x, state.thief.y, gem.x, gem.y) < state.thief.radius + 14) {
      gem.taken = true;
      state.loot += LOOT.gemValue;
      events |= EVENT_GEM;
    }
  }
  if (!state.vaultLoot.taken && distance(state.thief.x, state.thief.y, state.vaultLoot.x, state.vaultLoot.y) < state.thief.radius + 16) {
    state.vaultLoot.taken = true;
    state.loot += LOOT.vaultValue;
    events |= EVENT_VAULT;
  }
  return events;
}