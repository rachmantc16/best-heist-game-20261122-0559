// Drawing only: the world's state and the current screen in, pixels out. The 960x640
// playfield is scaled to fit the window and centred. Flat shapes and canvas text: a
// dark museum floor with a carpet runner, a gold vault room, red guard cones and amber
// camera cones, the thief in a hood, gems that glint, and a HUD with the alarm meter.
import { COLORS, FIELD, FONT, LOOT, TOOLS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const TILE = 40;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function drawCone(x, y, angle, halfAngle, range, fill, edge) {
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = edge;
    context.lineWidth = 1.5;
    context.stroke();
  }

  function drawFloor(level) {
    context.fillStyle = COLORS.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Marble tiles.
    context.fillStyle = COLORS.floorTile;
    for (let ty = 0; ty < FIELD.height / TILE; ty += 1) {
      for (let tx = 0; tx < FIELD.width / TILE; tx += 1) {
        if ((tx + ty) % 2 === 0) context.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    // The vault room's gold floor.
    const vault = level.vaultRoom;
    context.fillStyle = COLORS.vaultFloor;
    context.fillRect(vault.x, vault.y, vault.w, vault.h);
    context.fillStyle = COLORS.vaultFloorTile;
    for (let ty = 0; ty < vault.h / TILE; ty += 1) {
      for (let tx = 0; tx < vault.w / TILE; tx += 1) {
        if ((tx + ty) % 2 === 0) context.fillRect(vault.x + tx * TILE, vault.y + ty * TILE, TILE, TILE);
      }
    }
    // Carpet runner down the main hall.
    context.fillStyle = COLORS.carpet;
    context.fillRect(120, 330, 400, 60);
    context.strokeStyle = COLORS.carpetEdge;
    context.lineWidth = 3;
    context.strokeRect(120, 330, 400, 60);
    // Exit door mat, bottom-left. The label sits at the top edge so the thief
    // spawning in the doorway never covers it.
    const exit = level.exit;
    context.fillStyle = COLORS.exit;
    context.fillRect(exit.x, exit.y, exit.w, exit.h);
    text('EXIT', exit.x + exit.w / 2, exit.y + 20, 18, '#eafff1', 'center');
    // Vault door frame on the vault room's left wall.
    context.fillStyle = COLORS.vaultDoor;
    context.fillRect(640, 120, 24, 48);
    text('VAULT', 800, 56, 20, '#d8b45a', 'center');
  }

  function drawCover(rect) {
    context.fillStyle = COLORS.cover;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    context.fillStyle = COLORS.coverTop;
    context.fillRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
    context.strokeStyle = 'rgba(255,255,255,0.18)';
    context.lineWidth = 2;
    context.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  }

  function drawBush(bush) {
    context.fillStyle = COLORS.bush;
    context.beginPath();
    context.arc(bush.x, bush.y, bush.r, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = COLORS.bushTop;
    for (let index = 0; index < 5; index += 1) {
      const a = (index / 5) * Math.PI * 2 + 0.6;
      context.beginPath();
      context.arc(bush.x + Math.cos(a) * bush.r * 0.45, bush.y + Math.sin(a) * bush.r * 0.45, bush.r * 0.32, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawGem(x, y, radius, color, time) {
    const pulse = 1 + Math.sin(time * 3 + x) * 0.12;
    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.fillStyle = color;
    context.fillRect(-radius * pulse / 1.4, -radius * pulse / 1.4, radius * pulse * 1.4, radius * pulse * 1.4);
    context.fillStyle = 'rgba(255,255,255,0.65)';
    context.fillRect(-radius * pulse / 3.4, -radius * pulse / 3.4, radius * pulse / 1.7, radius * pulse / 1.7);
    context.restore();
  }

  function drawGuard(guard, time) {
    // Vision cone first, so the guard draws on top of it.
    drawCone(guard.x, guard.y, guard.angle, 0.5, 175, COLORS.coneGuard, COLORS.coneGuardEdge);
    context.fillStyle = COLORS.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = COLORS.guardCap;
    context.beginPath();
    context.arc(guard.x, guard.y, guard.radius * 0.62, 0, Math.PI * 2);
    context.fill();
    // Facing tick.
    context.strokeStyle = '#dfe8ff';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.lineTo(guard.x + Math.cos(guard.angle) * (guard.radius + 7), guard.y + Math.sin(guard.angle) * (guard.radius + 7));
    context.stroke();
    if (guard.mode === 'investigate') {
      text('?', guard.x, guard.y - guard.radius - 8, 18, '#ffd94d', 'center');
    } else if (guard.mode === 'chase') {
      text('!', guard.x, guard.y - guard.radius - 8, 20, '#ff5555', 'center');
    }
    void time;
  }

  function drawCamera(camera) {
    const fill = camera.jammed ? 'rgba(120,120,120,0.15)' : COLORS.coneCamera;
    const edge = camera.jammed ? 'rgba(160,160,160,0.4)' : COLORS.coneCameraEdge;
    drawCone(camera.x, camera.y, camera.angle, 0.42, 190, fill, edge);
    context.fillStyle = camera.jammed ? '#777' : COLORS.camera;
    context.beginPath();
    context.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = camera.jammed ? '#555' : '#ff4444';
    context.beginPath();
    context.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 3.5, 0, Math.PI * 2);
    context.fill();
    if (camera.jammed) text('JAMMED', camera.x, camera.y - 16, 11, '#bbbbbb', 'center');
  }

  function drawThief(thief, hidden) {
    if (hidden) {
      // Half-sunk in the bush: a hint of the hood among the leaves.
      context.globalAlpha = 0.75;
    }
    context.fillStyle = COLORS.thief;
    context.beginPath();
    context.arc(thief.x, thief.y, thief.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = COLORS.thiefHood;
    context.beginPath();
    context.arc(thief.x, thief.y, thief.radius * 0.66, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#fff8e0';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(thief.x, thief.y);
    context.lineTo(thief.x + Math.cos(thief.angle) * (thief.radius + 5), thief.y + Math.sin(thief.angle) * (thief.radius + 5));
    context.stroke();
    context.globalAlpha = 1;
  }

  function drawHud(state, best) {
    context.fillStyle = 'rgba(10, 9, 16, 0.82)';
    context.fillRect(0, 0, FIELD.width, 42);
    // Alarm meter.
    const meterX = 24;
    const meterW = 260;
    text('ALARM', meterX, 28, 15, COLORS.hud);
    context.fillStyle = '#33222a';
    context.fillRect(meterX + 62, 14, meterW, 16);
    const alarmColor = state.alarm > 68 ? COLORS.alarm : state.alarm > 30 ? '#ffaa33' : COLORS.alarmCalm;
    context.fillStyle = alarmColor;
    context.fillRect(meterX + 62, 14, (meterW * state.alarm) / 100, 16);
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.lineWidth = 1;
    context.strokeRect(meterX + 62, 14, meterW, 16);
    if (state.seen) text('SPOTTED!', meterX + 62 + meterW + 10, 28, 15, COLORS.alarm);
    // Loot, timer, tools.
    text(`LOOT $${state.loot}`, 470, 28, 17, COLORS.loot, 'left');
    text(formatTime(state.elapsed), 590, 28, 17, COLORS.hud, 'left');
    const jam = state.jamTimer > 0 ? `JAM ${Math.ceil(state.jamTimer)}s` : `Jammer $${TOOLS.jammer.cost} [J]`;
    text(jam, 936, 28, 14, state.jamTimer > 0 ? '#9fd8ff' : COLORS.hud, 'right');
    text(`Coin $${TOOLS.coin.cost} [Click]`, 680, 28, 13, COLORS.hud, 'left');
    void best;
  }

  function drawField(state, level, time) {
    drawFloor(level);
    for (const bush of level.bushes) drawBush(bush);
    for (const rect of level.covers) drawCover(rect);
    // Walls on top of the floor, with a lighter top edge.
    for (const rect of level.walls) {
      context.fillStyle = COLORS.wall;
      context.fillRect(rect.x, rect.y, rect.w, rect.h);
      context.fillStyle = COLORS.wallTop;
      context.fillRect(rect.x, rect.y, rect.w, 4);
    }
    // Loot.
    for (const gem of state.gems) {
      if (!gem.taken) drawGem(gem.x, gem.y, 9, COLORS.loot, time);
    }
    if (!state.vaultLoot.taken) {
      drawGem(state.vaultLoot.x, state.vaultLoot.y, 15, COLORS.vaultLoot, time);
      text('STAR SAPPHIRE', state.vaultLoot.x, state.vaultLoot.y - 24, 12, COLORS.vaultLoot, 'center');
    }
    // Thrown coin.
    if (state.coin.active) {
      context.strokeStyle = COLORS.loot;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(state.coin.x, state.coin.y, 10 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = COLORS.loot;
      context.beginPath();
      context.arc(state.coin.x, state.coin.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    for (const camera of state.cameras) drawCamera(camera);
    for (const guard of state.guards) drawGuard(guard, time);
    drawThief(state.thief, state.hidden);
  }

  function drawPanel(title, lines, prompt, titleColor = COLORS.hud) {
    context.fillStyle = 'rgba(8, 7, 14, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const width = 640;
    const height = 150 + lines.length * 32;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = '#17141f';
    context.fillRect(x, y, width, height);
    context.strokeStyle = '#6b5a2e';
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    text(title, FIELD.width / 2, y + 64, 44, titleColor, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 116 + index * 32, 19, '#cfc8b8', 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 30, 20, COLORS.loot, 'center');
  }

  /** Paint one frame: the field, the HUD, then a panel for the screen the game is on. */
  function draw(state, level, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0b0a12';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, level, time);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'MIDNIGHT VAULT HEIST',
        [
          'Slip through the museum, dodge the guards and cameras,',
          'steal the Star Sapphire from the vault, then reach the green EXIT.',
          'Move: WASD / arrows — sneak: Shift — throw a coin: click ($40)',
          'Jam the cameras: J ($60) — tools cost loot, so grab gems first.',
          `Best loot: $${best}`,
        ],
        'Press Space or click to start',
      );
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      const reason = state.alarm >= 100 ? 'The alarm hit 100% — the museum locked down.' : 'A guard grabbed you in the dark.';
      drawPanel(
        'CAUGHT!',
        [reason, `Loot kept: $${state.loot}   Time: ${formatTime(state.elapsed)}`, `Best loot: $${best}`],
        'Press Space or click to try again',
        COLORS.alarm,
      );
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'CLEAN GETAWAY!',
        [
          `The Star Sapphire is yours. Loot: $${state.loot}   Time: ${formatTime(state.elapsed)}`,
          `Best loot: $${best}`,
          'The museum never knew you were there.',
        ],
        'Press Space or click to play again',
        COLORS.loot,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
