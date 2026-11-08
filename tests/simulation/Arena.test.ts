import { describe, it, expect } from 'vitest';
import { Arena } from '../../src/simulation/Arena';
import type { ArenaConfig } from '../../src/simulation/types';

describe('Arena', () => {
  const testConfig: ArenaConfig = {
    cols: 24,
    rows: 16,
    tileSize: 40,
    obstacleDensity: 0.1,
    snowPileCount: 6,
    snowPileAmmo: 15,
    snowPileRespawnSeconds: 20,
  };

  it('generates arena with correct dimensions and pixel bounds', () => {
    const arena = new Arena(testConfig, 42);
    expect(arena.cols).toBe(24);
    expect(arena.rows).toBe(16);
    expect(arena.tileSize).toBe(40);
    expect(arena.width).toBe(960);
    expect(arena.height).toBe(640);
  });

  it('guarantees spawn zones are completely clear of obstacles', () => {
    const seeds = [1, 42, 999, 123456];
    for (const seed of seeds) {
      const arena = new Arena(testConfig, seed);
      const team1Spawns = arena.getSpawnPositions('team1');
      const team2Spawns = arena.getSpawnPositions('team2');

      expect(team1Spawns.length).toBeGreaterThan(0);
      expect(team2Spawns.length).toBeGreaterThan(0);

      // Verify no obstacle in spawn tiles
      for (let row = 0; row < arena.rows; row++) {
        expect(arena.getTile(1, row)).not.toBe('obstacle');
        expect(arena.getTile(arena.cols - 2, row)).not.toBe('obstacle');
      }
    }
  });

  it('places snow piles only on walkable ground tiles (not on obstacles or spawns)', () => {
    const arena = new Arena(testConfig, 100);
    expect(arena.snowPiles.length).toBeGreaterThan(0);

    for (const pile of arena.snowPiles) {
      const tile = pile.getTile(arena.tileSize);
      expect(arena.isWalkable(tile.col, tile.row)).toBe(true);
      expect(arena.getTile(tile.col, tile.row)).toBe('ground');
      expect(pile.remaining).toBe(testConfig.snowPileAmmo);
    }
  });

  it('maintains vertical-axis symmetry for obstacles and snow piles', () => {
    const arena = new Arena(testConfig, 2026);
    const halfCols = Math.floor(arena.cols / 2);

    // Obstacle symmetry
    for (let row = 0; row < arena.rows; row++) {
      for (let col = 0; col < halfCols; col++) {
        const leftType = arena.getTile(col, row);
        const rightType = arena.getTile(arena.cols - 1 - col, row);
        if (leftType === 'obstacle') {
          expect(rightType).toBe('obstacle');
        } else if (rightType === 'obstacle') {
          expect(leftType).toBe('obstacle');
        }
      }
    }

    // Snow pile count is even due to symmetric placement
    expect(arena.snowPiles.length % 2).toBe(0);
  });

  it('guarantees that every spawn and snow pile is reachable via flood-fill', () => {
    // Test across several distinct seeds
    const seeds = [7, 13, 101, 777, 9999];
    for (const seed of seeds) {
      const arena = new Arena(testConfig, seed);
      expect(arena.isAllReachable()).toBe(true);
    }
  });

  it('findNearestPile returns the closest non-depleted pile', () => {
    const arena = new Arena(testConfig, 42);
    const pos = { x: 100, y: 100 };
    const nearest = arena.findNearestPile(pos);

    expect(nearest).not.toBeNull();
    if (nearest) {
      // Depleting it should make findNearestPile pick another one (or none if only one)
      nearest.remaining = 0;
      const nextNearest = arena.findNearestPile(pos);
      if (nextNearest) {
        expect(nextNearest.id).not.toBe(nearest.id);
      }
    }
  });

  it('correctly maps walkability grid for pathfinding', () => {
    const arena = new Arena(testConfig, 42);
    const grid = arena.getWalkabilityGrid();

    expect(grid).toHaveLength(arena.rows);
    expect(grid[0]).toHaveLength(arena.cols);

    for (let r = 0; r < arena.rows; r++) {
      for (let c = 0; c < arena.cols; c++) {
        if (arena.getTile(c, r) === 'obstacle') {
          expect(grid[r]?.[c]).toBe(1);
        } else {
          expect(grid[r]?.[c]).toBe(0);
        }
      }
    }
  });

  it('returns false for isWalkable out-of-bounds', () => {
    const arena = new Arena(testConfig, 42);
    expect(arena.isWalkable(-1, 0)).toBe(false);
    expect(arena.isWalkable(0, -1)).toBe(false);
    expect(arena.isWalkable(arena.cols, 0)).toBe(false);
    expect(arena.isWalkable(0, arena.rows)).toBe(false);
  });
});
