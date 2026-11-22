// Midnight Vault Heist — the level and the rules, with no drawing and no browser in
// it. One museum floor: a vault room top-right, a gallery split by a divider wall with
// two gaps (two routes to the vault), a lower hall, display cases for cover, bushes to
// hide in, three patrolling guards, two sweeping cameras, six gems and the vault's Star
// Sapphire. step() advances one fixed step and returns what happened as bit flags.
import { ALARM, GUARD, THIEF } from './config.js';
import { distance, pointInRect } from './geometry.js';
import { createCameras, updateCameras } from './cameras.js';
import { createGuards, updateGuards } from './guards.js';
import { collectLoot, jamCameras, moveThief, throwCoin } from './thief.js';

export const EVENT_GEM = 1;
export const EVENT_VAULT = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_COIN = 16;
export const EVENT_JAM = 32;
export const EVENT_SPOTTED = 64;

/** The museum floor: walls and cases block movement and sight; bushes hide the thief. */
export function buildLevel() {
  const walls = [
    // Outer shell.
    { x: 0, y: 0, w: 960, h: 24 },
    { x: 0, y: 616, w: 960, h: 24 },
    { x: 0, y: 0, w: 24, h: 640 },
    { x: 936, y: 0, w: 24, h: 640 },
    // Vault room, top-right: left wall with a door gap at y 120..168.
    { x: 640, y: 24, w: 24, h: 96 },
    { x: 640, y: 168, w: 24, h: 56 },
    // Vault room floor.
    { x: 664, y: 200, w: 272, h: 24 },
    // Gallery divider, y 288..312, with two gaps: x 150..210 and x 420..480.
    { x: 24, y: 288, w: 126, h: 24 },
    { x: 210, y: 288, w: 210, h: 24 },
    { x: 480, y: 288, w: 80, h: 24 },
    // Right vertical wall, x 560..584, with a gap at y 470..530.
    { x: 560, y: 312, w: 24, h: 158 },
    { x: 560, y: 530, w: 24, h: 86 },
  ];
  // Display cases: cover that blocks movement and sight.
  const covers = [
    { x: 180, y: 70, w: 90, h: 46 },
    { x: 360, y: 110, w: 64, h: 48 },
    { x: 500, y: 80, w: 60, h: 60 },
    { x: 110, y: 380, w: 100, h: 50 },
    { x: 660, y: 360, w: 84, h: 56 },
    { x: 800, y: 470, w: 90, h: 50 },
    { x: 300, y: 470, w: 72, h: 60 },
  ];
  // Bushes: the thief hides inside them (guards cannot spot them unless very close).
  const bushes = [
    { x: 300, y: 200, r: 34 },
    { x: 700, y: 300, r: 34 },
    { x: 180, y: 540, r: 30 },
    { x: 450, y: 560, r: 30 },
  ];
  return {
    walls,
    covers,
    bushes,
    blockers: walls.concat(covers),
    exit: { x: 24, y: 544, w: 80, h: 72 },
    vaultRoom: { x: 664, y: 24, w: 272, h: 200 },
    start: { x: 64, y: 580 },
  };
}

function freshGems() {
  return [
    { x: 225, y: 93, taken: false },
    { x: 392, y: 134, taken: false },
    { x: 530, y: 110, taken: false },
    { x: 160, y: 405, taken: false },
    { x: 702, y: 388, taken: false },
    { x: 845, y: 495, taken: false },
    { x: 336, y: 500, taken: false },
  ];
}

export function createWorld() {
  const level = buildLevel();
  const state = {
    thief: { x: level.start.x, y: level.start.y, angle: -Math.PI / 2, radius: THIEF.radius, sneaking: false, moving: false },
    guards: createGuards(),
    cameras: createCameras(),
    gems: freshGems(),
    vaultLoot: { x: 880, y: 110, taken: false },
    loot: 0,
    alarm: 0,
    elapsed: 0,
    jamTimer: 0,
    coin: { x: 0, y: 0, timer: 0, active: false },
    lastSeen: null,
    seen: false,
    seenBy: null,
    hidden: false,
    status: 'playing',
  };

  function reset() {
    state.thief.x = level.start.x;
    state.thief.y = level.start.y;
    state.thief.angle = -Math.PI / 2;
    state.thief.sneaking = false;
    state.thief.moving = false;
    state.guards = createGuards();
    state.cameras = createCameras();
    state.gems = freshGems();
    state.vaultLoot.taken = false;
    state.loot = 0;
    state.alarm = 0;
    state.elapsed = 0;
    state.jamTimer = 0;
    state.coin.active = false;
    state.coin.timer = 0;
    state.lastSeen = null;
    state.seen = false;
    state.seenBy = null;
    state.hidden = false;
    state.status = 'playing';
  }

  function thiefHidden() {
    for (const bush of level.bushes) {
      if (distance(state.thief.x, state.thief.y, bush.x, bush.y) < bush.r) return true;
    }
    return false;
  }

  /**
   * One fixed step. `input` is {dx, dy, sneak} and `actions` carries the one-shot
   * tool requests {coin: {x, y} | null, jam: boolean} for this step.
   */
  function step(dt, input, actions) {
    if (state.status !== 'playing') return 0;
    let events = 0;
    state.elapsed += dt;

    moveThief(state.thief, input, dt, level);

    if (actions.coin) {
      if (throwCoin(state, actions.coin.x, actions.coin.y)) events |= EVENT_COIN;
    }
    if (actions.jam) {
      if (jamCameras(state)) events |= EVENT_JAM;
    }
    if (state.jamTimer > 0) state.jamTimer = Math.max(0, state.jamTimer - dt);
    if (state.coin.active) {
      state.coin.timer -= dt;
      if (state.coin.timer <= 0) state.coin.active = false;
    }

    const wasSeen = state.seen;
    state.hidden = thiefHidden();
    const sight = updateGuards(state.guards, dt, {
      blockers: level.blockers,
      thief: state.thief,
      hidden: state.hidden,
      alarm: state.alarm,
      coin: state.coin,
      lastSeen: state.lastSeen,
    });
    const cameraSight = updateCameras(state.cameras, dt, {
      blockers: level.blockers,
      thief: state.thief,
      hidden: state.hidden,
      jammed: state.jamTimer > 0,
    });

    state.seen = sight.seen || cameraSight.seen;
    state.seenBy = sight.seen ? 'guard' : cameraSight.seen ? 'camera' : null;
    if (state.seen && !wasSeen) events |= EVENT_SPOTTED;
    if (state.seen) {
      state.lastSeen = { x: state.thief.x, y: state.thief.y };
      const rate = sight.seen ? ALARM.guardRate : ALARM.cameraRate;
      state.alarm = Math.min(ALARM.max, state.alarm + rate * (state.thief.sneaking ? 0.7 : 1) * dt);
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decayRate * dt);
    }

    const lootEvents = collectLoot(state, level);
    events |= lootEvents;

    // Caught: a guard touches the thief, or the alarm maxes out.
    for (const guard of state.guards) {
      if (distance(guard.x, guard.y, state.thief.x, state.thief.y) < GUARD.catchRadius) {
        state.status = 'caught';
        return events | EVENT_CAUGHT;
      }
    }
    if (state.alarm >= ALARM.max) {
      state.status = 'caught';
      return events | EVENT_CAUGHT;
    }

    // Win: the Star Sapphire is taken and the thief reaches the exit door.
    if (state.vaultLoot.taken && pointInRect(state.thief.x, state.thief.y, level.exit)) {
      state.status = 'won';
      return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, level, reset, step, thiefHidden };
}