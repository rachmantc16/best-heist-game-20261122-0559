// The screenshot scenes behind ?shot=cover|title|caught|win. Each one stages a real,
// reachable state of the game and renders it with the game's own code: the title
// screen over a fresh floor, a mid-heist frame with the thief crossing the hall while
// guards sweep and the alarm sits at 34, the caught moment, and the clean getaway.
// Guards and cameras are first advanced a few seconds from a fresh world so their
// patrol positions and cone angles are ones a real game reaches, not hand-placed.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const IDLE_INPUT = { dx: 0, dy: 0, sneak: false };
const NO_ACTIONS = { coin: null, jam: false };

/** Advance the world `seconds` with the thief standing still (a safe corner). */
function idle(world, seconds) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    world.step(STEP, IDLE_INPUT, NO_ACTIONS);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any other name stages the cover scene.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name === 'title') {
    world.reset();
    idle(world, 3);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'caught') {
    world.reset();
    idle(world, 2);
    const guard = state.guards[0];
    state.thief.x = guard.x + 20;
    state.thief.y = guard.y;
    state.thief.angle = Math.atan2(guard.y - state.thief.y, guard.x - state.thief.x);
    state.alarm = 100;
    state.elapsed = 73;
    state.loot = 180;
    state.status = 'caught';
    return { screen: SCREEN_OVER };
  }
  if (name === 'win') {
    world.reset();
    idle(world, 2);
    for (const gem of state.gems) gem.taken = true;
    state.vaultLoot.taken = true;
    state.loot = 920;
    state.thief.x = 64;
    state.thief.y = 580;
    state.thief.angle = -Math.PI / 2;
    state.elapsed = 185;
    state.status = 'won';
    return { screen: SCREEN_WIN };
  }
  // Cover: mid-heist. The thief is crossing the main hall toward the vault with two
  // gems already pocketed, the alarm warm, guards sweeping and cameras turning.
  world.reset();
  idle(world, 8);
  state.gems[0].taken = true;
  state.gems[3].taken = true;
  state.loot = 120;
  // On the carpet below the divider: clear of the cones above, still in the thick of it.
  state.thief.x = 430;
  state.thief.y = 345;
  state.thief.angle = -Math.PI / 4;
  state.alarm = 34;
  state.elapsed = 47;
  return { screen: SCREEN_PLAY };
}
