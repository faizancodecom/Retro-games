# Retro Cyber Arcade

A static, browser-based arcade portal built with TypeScript, Vite, and HTML5 Canvas. The project runs entirely client-side without any backend dependencies, providing 33 playable retro titles across 10 genres with dynamic engine loading, procedural audio synthesis, Gamepad API support with custom remapping, virtual touch controls, and 20-level difficulty progression.

## Overview

- Stack: TypeScript, Vite, HTML5 Canvas 2D, Web Audio API, Gamepad API
- Rendering: Pure Canvas 2D with nearest-neighbor pixel scaling and optional CRT scanline post-processing
- Audio: Procedural synthesizer using Web Audio API oscillators and noise buffers (no external audio assets required)
- Input: Keyboard, HTML5 Gamepad with configurable remapping and haptics, and dynamic virtual touch controls
- Progression: 20 unlockable levels per title with scaling speed, spawn rates, and score objectives
- Persistence: High scores, level clears, RPG saves, career garage data, and input bindings stored in localStorage
- Hosting: Fully static build deployable to GitHub Pages, Vercel, Netlify, or any static file server

## Quick Start

### Prerequisites

Node.js 18 or higher with npm.

### Installation and Run

```bash
# Clone the repository
git clone https://github.com/faizancodecom/Retro-games.git
cd Retro-games

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open the local development URL shown in your terminal (typically `http://localhost:5173`).

### Production Build

```bash
# Type check and build static output
npm run build

# Preview the production bundle locally
npm run preview
```

The production assets are generated in the `dist/` directory and can be deployed directly to any static web host.

## Project Structure

```text
Retro games/
├── index.html                 # App shell and root canvas mounting container
├── package.json               # Scripts and dependencies (TypeScript, Vite)
├── tsconfig.json              # TypeScript configuration
└── src/
    ├── main.ts                # Application bootstrapper and page-level render dispatcher
    ├── types.ts               # Core interfaces (GameDefinition, GameEngine, EngineContext)
    ├── app/
    │   ├── router.ts          # Hash-based routing (#/, #/game/:slug, #/war)
    │   ├── search.ts          # Real-time search and genre filter logic
    │   ├── storage.ts         # localStorage abstraction for scores, settings, and state
    │   ├── gamepad.ts         # Gamepad API polling, deadzones, stick handling, and dispatch
    │   ├── controllerBindings.ts # Input remapping tables and binding storage
    │   ├── gameSfx.ts         # Web Audio procedural sound effect generator
    │   └── levelProgress.ts   # 20-level clear and unlock tracking
    ├── data/
    │   ├── genres.ts          # Genre definitions and color token mapping
    │   └── registry.ts        # Game catalog definitions and metadata
    ├── engines/
    │   ├── base.ts            # BaseEngine abstract class (loop, delta time, scaling, audio)
    │   ├── loader.ts          # Dynamic import loader for engine modules
    │   ├── levelConfig.ts     # 20-level configuration presets and parameter curves
    │   ├── levelScale.ts      # Multiplier calculations for game speed and objectives
    │   └── [engine-name].ts   # Individual game engine implementations
    ├── styles/
    │   ├── theme.css          # Color tokens, neon accents, and scanline shader styles
    │   └── layout.css         # Grid layouts, responsive panels, and touch controls
    └── ui/
        ├── header.ts          # Header component with search, genre chips, and controls
        ├── gameGrid.ts        # Game catalog grid and pagination
        ├── thumbnails.ts      # Procedural canvas preview generators for game cards
        ├── gamePlayer.ts      # Game canvas wrapper, HUD, score tracker, and level switcher
        ├── controllerPanel.ts # Gamepad status and interactive input remap modal
        ├── controllerAnimation.ts # Controller connection toast animations
        └── footer.ts          # Footer component
```

## Game Catalog

The arcade includes 33 titles running on modular Canvas 2D engines:

| Title | Slug | Genre | Engine | Gameplay Summary |
| --- | --- | --- | --- | --- |
| Ocean War | ocean-war | Action | war | Naval combat flight shooter with missile barrages |
| NET Quest | story-mode | Adventure | story | Turn-based RPG with dialogue, encounters, and progression |
| Pixel Miner | pixel-miner | Arcade | pixelminer | Vertical digging survival with resource collection |
| Dungeon Escape | dungeon-escape | Adventure | dungeon | Procedural dungeon stealth with key hunting and patrolling guards |
| Space Defender | space-defender | Shooter | defender | Free-roam 2D space shooter defending against alien waves |
| Castle Archer | castle-archer | Action | archer | Ballistic archery defense with angle and power timing |
| Retro Racer | retro-racer | Racing | toprace | Top-down oval circuit racing with AI competition |
| Flappy Bird | flappy-bird | Arcade | flappy | Precision tap-to-flap navigation through pipe corridors |
| Pac-Man | pac-man | Arcade | pacman | Classic maze traversal, pellet collection, and ghost hunting |
| Most Wanted | most-wanted | Racing | wanted | Top-down police chase getaway with vehicular ramming |
| Turbo Career | turbo-career | Racing | racecareer | Multi-track racing campaign with cash, car upgrades, and saves |
| Tic Tac Toe | tic-tac-toe | Strategy | tictactoe | Grid strategy against minimax CPU or local 2-player |
| Blackjack 21 | blackjack | Card | blackjack | Casino card game with chip betting and persistent bankroll |
| UNO | uno | Card | uno | Multi-card matching game supporting 2 to 4 players vs CPU |
| Target Shooter | target-shooter | Shooter | gallery | Neon shooting gallery with combo multipliers and reload management |
| Zombie Survival | zombie-survival | Shooter | zombie | Top-down arena survival with weapon switching and waves |
| Chess | chess | Strategy | chess | Full board chess with legal move validation, castling, and CPU AI |
| Neon Pong | pong | Sports | pong | High-speed paddle duel against progressive CPU |
| Snake | snake | Arcade | snake | Grid-based snake with collision detection and speed ramping |
| Tetris | tetris | Puzzle | tetris | Block stacking, line clearing, and drop mechanics |
| Breakout | breakout | Arcade | breakout | Ball-and-paddle neon brick breaker |
| Space Invaders | space-invaders | Shooter | shooter | Fixed shooter defending against descending alien formations |
| Pixel Run | pixel-run | Platform | runner | Endless runner with obstacles, jump, and double-jump timing |
| 2048 | 2048 | Puzzle | puzzle | Sliding number tile puzzle with binary merging |
| Jump Quest | jump-quest | Platform | platformer | Platformer with coin collection, moving hazards, and spikes |
| Asteroids | asteroids | Shooter | asteroids | Vector-style rotational ship flight with splitting space rocks |
| Frogger | frogger | Arcade | frogger | Multi-lane traffic and river log traversal |
| Whack-a-Mole | whack-a-mole | Arcade | whack | Reflex-based mole whacking with chain combos and hazards |
| Memory Match | memory-match | Puzzle | puzzle | Card pair memory puzzle |
| 15 Puzzle | 15-puzzle | Puzzle | puzzle | Sliding numerical tile ordering puzzle |
| Color Connect | color-connect | Puzzle | puzzle | Adjacency cluster clearing puzzle |
| Card War | card-war | Card | card | Card comparison duel with streak tracking |
| Lane Racer | lane-racer | Racing | racing | Multi-lane highway reflex dodging at high velocity |

## Controls

### Keyboard Defaults

| Action | Primary Keys | Secondary / Alternative |
| --- | --- | --- |
| Movement / Direction | Arrow Keys | W, A, S, D |
| Primary Action / Jump / Fire | Space | Enter |
| Accelerate (Racing) | Up Arrow | W |
| Brake / Reverse (Racing) | Down Arrow | S |
| Switch Weapon (Zombie Survival) | 1, 2, 3 | Number keys |
| Mode / Toggle 2-Player (Chess, Tic Tac Toe) | M | - |
| Reset Board | R | - |
| Reload (Target Shooter) | R | Auto-reloads when empty |

### Gamepad Controls

Plug in any standard USB or Bluetooth gamepad (Xbox, PlayStation, or generic direct-input controllers). The arcade detects connections automatically and displays a notification.

| Function | Default Button |
| --- | --- |
| Steering / Direction | Left Analog Stick / D-Pad |
| Action / Jump / Fire / Confirm | A (Cross) |
| Alternate Action | B (Circle) / X (Square) |
| Accelerate | RB / R1 / Right Trigger |
| Brake | LB / L1 / Left Trigger |

To customize button assignments, click the gamepad icon in the top header to open the remap modal. Remapped layouts are saved to browser storage.

### Mobile and Touch Controls

On touch-enabled devices, an adaptive on-screen overlay is injected below the canvas:
- D-Pad: Provided for maze, grid, and navigation titles (Pac-Man, Snake, RPG, Dungeon).
- Horizontal / Vertical Bars: Provided for lane racers and paddle games.
- Action Buttons: Distinct on-screen action pads (FLAP, JUMP, FIRE, OK) mapped to key events.

## Architecture and Subsystems

### Dynamic Engine Loading

Engines are isolated into individual TypeScript modules under `src/engines/`. When a user navigates to a game route (`#/game/:slug`), `loadEngine()` in `src/engines/loader.ts` triggers an asynchronous `import()` for the specific engine file. Unplayed engines are excluded from the initial bundle evaluation, keeping initial page load fast.

### Base Engine Lifecycle

Every action and arcade engine inherits from `BaseEngine` (`src/engines/base.ts`), which provides:
- Standardized fixed internal canvas dimensions (e.g., 320x240) scaled to display resolution with integer pixel scaling (`imageSmoothingEnabled = false`).
- Frame loop handling via `requestAnimationFrame` with delta time normalization.
- Input state management (`keys` Set, pointer event routing).
- Level progression hook integration and score synchronization.
- Mute-aware audio triggering via `playGameSfx()`.

```typescript
export interface GameEngine {
  start(): void;
  stop(): void;
  restart(): void;
  setMuted(muted: boolean): void;
  getScore(): number;
  handlePointer?(x: number, y: number): void;
}
```

### Procedural Web Audio

Audio is generated at runtime via the Web Audio API (`src/app/gameSfx.ts`) using standard oscillators (square, sawtooth, triangle, sine) and white noise buffers:
- Sound effects include jumps, score ticks, landings, hits, level clears, game over stingers, and controller connection chimes.
- Requires zero audio media files, eliminating HTTP asset latency.
- Audio volume and mute preferences are respected globally and stored in `localStorage`.

### Level Progression System

Games feature a 20-level scaling system configured in `src/engines/levelConfig.ts`:
- Each level defines difficulty adjustments: speed multipliers, spawn rates, obstacle frequencies, and target score thresholds.
- Completing a level's score target triggers an unlock event, recording the achievement in `localStorage`.
- Players can toggle between any previously unlocked level directly from the player interface.

### Storage Keys

Persistent browser storage utilizes the following key conventions:

| Key Pattern | Purpose |
| --- | --- |
| `retro-arcade-hs-<slug>` | High score record for a specific game |
| `retro-arcade-level-<slug>` | Highest unlocked level index (1-20) |
| `retro-arcade-play-level-<slug>` | Last selected play level |
| `retro-arcade-state-<key>` | Extended game saves (NET Quest story, Turbo Career garage, Blackjack bankroll) |
| `retro-arcade-crt` | CRT scanline effect toggle status (`1` or `0`) |
| `retro-arcade-muted` | Audio mute toggle status (`1` or `0`) |
| `retro-arcade-bindings` | JSON object containing customized controller button maps |

## Adding a New Game

To introduce a new game to the portal:

1. Create the engine in `src/engines/<name>.ts` extending `BaseEngine` (or implementing `GameEngine`).
2. Add the engine key to `EngineType` in `src/types.ts`.
3. Register the dynamic module import switch case in `src/engines/loader.ts`.
4. Configure control instructions and touch layout mappings in `src/ui/gamePlayer.ts`.
5. Add the game metadata entry to `GAMES` in `src/data/registry.ts`:

```typescript
{
  slug: 'my-retro-game',
  title: 'My Retro Game',
  genre: 'Arcade',
  tags: ['arcade', 'pixel', 'custom'],
  engine: 'myengine',
  configId: 'my-retro-game-1',
  description: 'Short gameplay summary displayed in catalog search and cards.',
}
```

6. Run `npm run build` to confirm TypeScript compiles without errors.

## Development Commands

```bash
# Start local dev server with hot module replacement
npm run dev

# Run TypeScript compilation and build production assets
npm run build

# Preview production build locally
npm run preview
```

## Browser Support

Requires a modern browser supporting:
- ES2020 JavaScript modules
- HTML5 Canvas 2D Context
- Web Audio API (`AudioContext`)
- Gamepad API (`navigator.getGamepads`)
- `localStorage` API

Compatible with current versions of Chrome, Firefox, Safari, and Edge on desktop and mobile.

## License

This project is licensed under the MIT License.
