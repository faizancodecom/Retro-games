# Retro Cyber Arcade

A static retro game portal with **110+ playable pixel games** in a cyber-night theme.

## Features

- Search by name, genre, or tags (try `flappy`, `pac`, `tetris`)
- Genre filters: Arcade, Puzzle, Shooter, Racing, and more
- Flagship titles: **Flappy Bird**, **Pac-Man Advanced**, Tetris, Space Invaders, Snake, and many variants
- High scores saved in `localStorage`
- CRT scanline toggle and random game picker
- Fully static — no backend required

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Netlify, GitHub Pages, etc.).

## Controls

Each game shows control hints on its play screen. Most games use arrow keys / WASD and Space; mobile tap is supported for flappy, runner, and puzzle games.

## Tech

- Vite + TypeScript
- HTML5 Canvas 2D
- Hash-based routing (`#/game/flappy-bird`)
- Dynamic engine loading per game type
