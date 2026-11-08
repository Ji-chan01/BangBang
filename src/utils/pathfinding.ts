/**
 * Pathfinding — easystarjs wrapper.
 *
 * Wraps the easystarjs A* pathfinding library with a Promise-based API.
 * easystarjs is asynchronous by design (it can spread calculations across
 * frames), so we wrap it to be Promise-friendly.
 */

import EasyStar from 'easystarjs';
import type { TilePosition } from '../simulation/types';

export class Pathfinder {
  private easystar: EasyStar.js;

  constructor() {
    this.easystar = new EasyStar.js();
    this.easystar.setAcceptableTiles([0]); // 0 = walkable
    this.easystar.enableDiagonals();
    this.easystar.enableCornerCutting();
  }

  /** Set the walkability grid. 0 = walkable, 1 = blocked. */
  setGrid(grid: number[][]): void {
    this.easystar.setGrid(grid);
  }

  /**
   * Find a path from start to end.
   * Returns an array of tile positions (empty if no path found).
   */
  findPath(start: TilePosition, end: TilePosition): Promise<TilePosition[]> {
    return new Promise((resolve) => {
      this.easystar.findPath(start.col, start.row, end.col, end.row, (path) => {
        if (path === null) {
          resolve([]);
        } else {
          resolve(path.map((p) => ({ col: p.x, row: p.y })));
        }
      });
      // easystarjs requires calculate() to be called to process queued paths.
      // Calling it immediately makes findPath effectively synchronous,
      // which is fine for our use case (one path at a time).
      this.easystar.calculate();
    });
  }
}
