# 🎯 BangBang

A top-down tactical snowball fight game inspired by Snowcraft. Command a squad of 3 kids with distinct roles — Thrower, Runner, and Builder — in fast-paced snowball battles against AI or human opponents.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict) |
| Build | Vite 8 |
| UI | React 19 + Tailwind CSS 4 |
| Game Engine | Phaser 4 |
| UI State | Zustand |
| Pathfinding | easystarjs |
| Testing | Vitest |
| Hosting | Vercel (Hobby) |
| Database | Neon Postgres + Drizzle ORM |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format

# Production build
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. See the file for documentation.

## Project Structure

```
src/
├── components/    # React UI (screens, HUD, overlays)
├── events/        # Typed EventBus (React ↔ Phaser)
├── game/          # Phaser scenes and rendering
├── simulation/    # Pure TS game logic (no Phaser imports)
├── ai/            # AI controllers (no Phaser imports)
├── net/           # Multiplayer abstraction
├── config/        # JSON balance/level data
├── stores/        # Zustand UI state
└── utils/         # Math, RNG, pathfinding helpers
```

## Architecture

- **React** renders all UI (menus, HUD, overlays) on top of the game canvas.
- **Phaser** renders the game world (sprites, animations, particles).
- **EventBus** is the sole communication channel between React and Phaser.
- **Simulation** layer is pure TypeScript with zero Phaser imports — testable and reusable for multiplayer.

## License

All rights reserved. This is a personal project.
