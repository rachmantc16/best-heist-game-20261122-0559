// Midnight Vault Heist — the entry program (Node 22, standard library only). The game
// is this directory's game/ folder: plain static files a desktop browser loads offline
// (game/index.html and its ES modules, no library, no network request). This program
// hands the entry in: it copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. It refuses to hand in anything the scorer would refuse outright
// (too many screenshots, one too large, a game/ folder over its caps), so a bad build
// fails here, loudly, instead of silently entering as an invalid entry.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty (RULES.txt): game/ holds at most 993 files and
// directories together and 48 MiB in all; screenshots/ holds at most 4 images, each at
// most 256 KiB; the dossier is capped at 160 KiB of source text. The whole of /output
// shares the platform's own 1,000-entry, 64 MiB cap, so game/ leaves it room.
const LIMITS = {
  textMaxBytes: 163840,
  screenshotsMax: 4,
  screenshotMaxBytes: 262144,
  gameMaxFiles: 993,
  gameMaxBytes: 50331648,
  gamePathMaxBytes: 1000,
};

function countEntries(dir: string): number {
  let count = 1;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? countEntries(join(dir, entry.name)) : 1;
  }
  return count;
}

function totalBytes(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? totalBytes(path) : statSync(path).size;
  }
  return total;
}

function fail(message: string): never {
  throw new Error(`midnight-vault-heist main.ts: ${message}`);
}

const gameDir = join(here, 'game');
if (!existsSync(gameDir)) fail('game/ is missing');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (countEntries(gameDir) > LIMITS.gameMaxFiles) fail('game/ holds more than 993 files and directories');
if (totalBytes(gameDir) > LIMITS.gameMaxBytes) fail('game/ is over 48 MiB');

const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > LIMITS.screenshotsMax) {
  fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > LIMITS.screenshotMaxBytes) fail(`screenshots/${name} is over 256 KiB`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: LIMITS.textMaxBytes,
    screenshots: { max: LIMITS.screenshotsMax, max_bytes: LIMITS.screenshotMaxBytes },
    game_max_files: LIMITS.gameMaxFiles,
    game_max_bytes: LIMITS.gameMaxBytes,
    game_path_max_bytes: LIMITS.gamePathMaxBytes,
  }),
);
