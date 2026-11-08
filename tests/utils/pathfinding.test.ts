import { describe, it, expect, beforeEach } from 'vitest';
import { Pathfinder } from '../../src/utils/pathfinding';

describe('Pathfinder (easystarjs wrapper)', () => {
  let pathfinder: Pathfinder;

  beforeEach(() => {
    pathfinder = new Pathfinder();
  });

  it('finds a direct path on an open grid', async () => {
    // 5x5 grid with all 0s (walkable)
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    pathfinder.setGrid(grid);

    const path = await pathfinder.findPath({ col: 0, row: 0 }, { col: 4, row: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ col: 0, row: 0 });
    expect(path[path.length - 1]).toEqual({ col: 4, row: 0 });
  });

  it('finds a path around an obstacle wall', async () => {
    // Wall down column 2 with gap at row 4
    const grid = [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    pathfinder.setGrid(grid);

    const path = await pathfinder.findPath({ col: 0, row: 0 }, { col: 4, row: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ col: 4, row: 0 });

    // Path must not step on any blocked tile (col 2, rows 0-3)
    for (const step of path) {
      if (step.col === 2) {
        expect(step.row).toBe(4); // Only the gap is open
      }
    }
  });

  it('returns empty array when target is completely enclosed/unreachable', async () => {
    // Target at (4,4) is completely enclosed by 1s
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1],
      [0, 0, 0, 1, 0],
    ];
    pathfinder.setGrid(grid);

    const path = await pathfinder.findPath({ col: 0, row: 0 }, { col: 4, row: 4 });
    expect(path).toEqual([]);
  });

  it('returns single node path when start and end are identical', async () => {
    const grid = [
      [0, 0],
      [0, 0],
    ];
    pathfinder.setGrid(grid);

    const path = await pathfinder.findPath({ col: 1, row: 1 }, { col: 1, row: 1 });
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ col: 1, row: 1 });
  });
});
