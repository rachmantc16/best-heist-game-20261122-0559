// Midnight Vault Heist — configuration: every tunable number of the game lives here,
// so balancing the stealth (speeds, cone sizes, alarm rates, tool costs) never means
// hunting through the logic files.
export const FIELD = { width: 960, height: 640 };

export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  speed: 165, // px per second
  sneakSpeed: 95, // while Shift is held: slower, quieter, harder to spot
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 118,
  investigateSpeed: 88,
  /** How far a guard can see, in px. */
  sightRange: 175,
  /** Half-angle of a guard vision cone, in radians. */
  sightHalfAngle: 0.5,
  /** Radius inside which a guard catches the thief on contact. */
  catchRadius: 26,
  /** How close the thief must be to a guard before a bush stops hiding them. */
  bushRevealRadius: 46,
};

export const CAMERA = {
  sightRange: 190,
  sightHalfAngle: 0.42,
  /** Sweep speed of a rotating camera, radians per second. */
  sweepSpeed: 0.55,
  /** How far a camera's mount lets its cone swing, each side of its base angle. */
  sweepArc: 0.85,
};

export const ALARM = {
  /** Per second while any guard sees the thief. */
  guardRate: 52,
  /** Per second while any camera sees the thief. */
  cameraRate: 38,
  /** Per second while nobody sees the thief. */
  decayRate: 14,
  /** Above this, guards abandon patrol and chase the last seen position. */
  chaseThreshold: 68,
  max: 100,
};

export const TOOLS = {
  /** A thrown coin: the nearest guard walks over to investigate it. */
  coin: { cost: 40, range: 300, investigateSeconds: 4 },
  /** A jammer: every camera goes blind for a few seconds. */
  jammer: { cost: 60, jamSeconds: 5 },
};

export const LOOT = {
  /** Value of the vault's Star Sapphire — the heist's target. */
  vaultValue: 500,
  /** Value of each small gem in a display case. */
  gemValue: 60,
};

export const COLORS = {
  floor: '#1c1a26',
  floorTile: '#232033',
  carpet: '#3d1f2b',
  carpetEdge: '#6b2d3a',
  vaultFloor: '#2b2413',
  vaultFloorTile: '#332b17',
  wall: '#4a4560',
  wallTop: '#5d5878',
  cover: '#2e4a3a',
  coverTop: '#3d6350',
  bush: '#274d2f',
  bushTop: '#356b40',
  exit: '#1f7a4d',
  vaultDoor: '#8a6d2f',
  loot: '#ffd94d',
  vaultLoot: '#ff5d8f',
  thief: '#e8e4d8',
  thiefHood: '#2b2b3a',
  guard: '#3a5a8c',
  guardCap: '#22375c',
  camera: '#c8c8d0',
  coneGuard: 'rgba(255, 64, 64, 0.20)',
  coneGuardEdge: 'rgba(255, 90, 90, 0.55)',
  coneCamera: 'rgba(255, 190, 60, 0.20)',
  coneCameraEdge: 'rgba(255, 200, 90, 0.55)',
  hud: '#f2ead8',
  alarm: '#ff4444',
  alarmCalm: '#57d977',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best loot is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault-heist.best';
