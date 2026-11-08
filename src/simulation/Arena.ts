/**
 * Arena — The game world grid.
 *
 * A 2D grid of tiles where the action happens. Handles:
 * - Tile walkability (ground vs obstacle)
 * - Procedural generation with vertical-axis symmetry
 * - Snow pile placement
 * - Spawn position assignment
 * - Reachability guarantee: flood-fill verification ensures all spawns
 *   and snow piles are reachable.
 *
 * No Phaser imports — pure simulation data.
 */

import type { ArenaConfig, TileType, TilePosition, Position } from './types';
import { tileToWorld, worldToTile } from '../utils/math';
import { SeededRandom } from '../utils/random';
import { SnowPile, resetSnowPileIdCounter } from './SnowPile';

export class Arena {
  readonly cols: number;
  readonly rows: number;
  readonly tileSize: number;

  /** The tile grid. grid[row][col] gives the tile type. */
  grid: TileType[][];

  /** Active snow piles on the arena. */
  snowPiles: SnowPile[] = [];

  /** Width of the arena in pixels. */
  get width(): number {
    return this.cols * this.tileSize;
  }

  /** Height of the arena in pixels. */
  get height(): number {
    return this.rows * this.tileSize;
  }

  constructor(config: ArenaConfig, seed: number) {
    this.cols = config.cols;
    this.rows = config.rows;
    this.tileSize = config.tileSize;
    this.grid = [];

    this.generate(config, seed);
  }

  /** Is a tile walkable (not an obstacle or out of bounds)? */
  isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    const tileRow = this.grid[row];
    if (!tileRow) return false;
    return tileRow[col] !== 'obstacle';
  }

  /** Get the tile type at a position. Returns 'obstacle' for out-of-bounds. */
  getTile(col: number, row: number): TileType {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 'obstacle';
    return this.grid[row]?.[col] ?? 'obstacle';
  }

  /** Get the center position of a tile in world coordinates. */
  getTileCenter(col: number, row: number): Position {
    return tileToWorld({ col, row }, this.tileSize);
  }

  /** Get team1 or team2 spawn positions. */
  getSpawnPositions(team: 'team1' | 'team2'): Position[] {
    const spawnType: TileType = team === 'team1' ? 'spawn_team1' : 'spawn_team2';
    const positions: Position[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row]?.[col] === spawnType) {
          positions.push(this.getTileCenter(col, row));
        }
      }
    }
    return positions;
  }

  /** Find the nearest non-depleted snow pile to a position. */
  findNearestPile(pos: Position): SnowPile | null {
    let nearest: SnowPile | null = null;
    let bestDist = Infinity;

    for (const pile of this.snowPiles) {
      if (pile.isDepleted) continue;
      const dx = pile.position.x - pos.x;
      const dy = pile.position.y - pos.y;
      const dist = dx * dx + dy * dy; // squared distance is fine for comparison
      if (dist < bestDist) {
        bestDist = dist;
        nearest = pile;
      }
    }
    return nearest;
  }

  /**
   * Get the walkability grid as a 2D number array for pathfinding.
   * 0 = walkable, 1 = blocked.
   */
  getWalkabilityGrid(): number[][] {
    return this.grid.map((row) => row.map((tile) => (tile === 'obstacle' ? 1 : 0)));
  }

  /**
   * Verifies via 4-directional flood-fill (BFS) that all spawn points
   * (both teams) and all snow piles are connected in one walkable component.
   */
  isAllReachable(): boolean {
    const startSpawns = this.getSpawnPositions('team1');
    if (startSpawns.length === 0) return false;
    const startPos = startSpawns[0];
    if (!startPos) return false;
    const startTile = worldToTile(startPos, this.tileSize);

    const visited = new Set<string>();
    const queue: TilePosition[] = [startTile];
    visited.add(`${startTile.col},${startTile.row}`);

    const dirs = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const { dc, dr } of dirs) {
        const nc = current.col + dc;
        const nr = current.row + dr;
        const key = `${nc},${nr}`;
        if (!visited.has(key) && this.isWalkable(nc, nr)) {
          visited.add(key);
          queue.push({ col: nc, row: nr });
        }
      }
    }

    // Verify all team1 spawns reached
    for (const p of this.getSpawnPositions('team1')) {
      const t = worldToTile(p, this.tileSize);
      if (!visited.has(`${t.col},${t.row}`)) return false;
    }

    // Verify all team2 spawns reached
    for (const p of this.getSpawnPositions('team2')) {
      const t = worldToTile(p, this.tileSize);
      if (!visited.has(`${t.col},${t.row}`)) return false;
    }

    // Verify all snow piles reached
    for (const pile of this.snowPiles) {
      const t = pile.getTile(this.tileSize);
      if (!visited.has(`${t.col},${t.row}`)) return false;
    }

    return true;
  }

  /** Internal: generate the arena procedurally with reachability guarantee. */
  private generate(config: ArenaConfig, seed: number): void {
    const rng = new SeededRandom(seed);

    // Try up to 50 generated layouts to find one that naturally connects all points
    const maxAttempts = 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.buildAttempt(config, rng);
      if (this.isAllReachable()) {
        return;
      }
    }

    // Fallback: If not all reachable after attempts, clear obstacles isolating targets
    this.ensureReachabilityByClearing();
  }

  /** Internal: build a single generation attempt. */
  private buildAttempt(config: ArenaConfig, rng: SeededRandom): void {
    resetSnowPileIdCounter();
    this.snowPiles = [];
    this.grid = [];

    // Initialize grid with ground
    for (let row = 0; row < this.rows; row++) {
      const gridRow: TileType[] = [];
      for (let col = 0; col < this.cols; col++) {
        gridRow.push('ground');
      }
      this.grid.push(gridRow);
    }

    // Place spawn zones (col 1 for team1, col cols-2 for team2)
    for (let row = Math.floor(this.rows / 3); row < Math.floor((this.rows * 2) / 3); row++) {
      this.setTile(1, row, 'spawn_team1');
      this.setTile(this.cols - 2, row, 'spawn_team2');
    }

    // Place obstacles with vertical-axis symmetry
    const halfCols = Math.floor(this.cols / 2);
    const obstacleCount = Math.floor(halfCols * this.rows * config.obstacleDensity);

    for (let i = 0; i < obstacleCount; i++) {
      const col = rng.int(3, halfCols - 1); // Leave spawn zones clear
      const row = rng.int(1, this.rows - 2); // Leave top/bottom rows clear

      if (this.getTile(col, row) !== 'ground') continue;

      this.setTile(col, row, 'obstacle');
      // Mirror
      this.setTile(this.cols - 1 - col, row, 'obstacle');
    }

    // Place snow piles with symmetry
    const pileCount = Math.floor(config.snowPileCount / 2);
    const usedTiles = new Set<string>();

    for (let i = 0; i < pileCount; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 20 && !placed; attempt++) {
        const col = rng.int(3, halfCols - 1);
        const row = rng.int(1, this.rows - 2);
        const key = `${col},${row}`;

        if (this.isWalkable(col, row) && !usedTiles.has(key)) {
          usedTiles.add(key);
          usedTiles.add(`${this.cols - 1 - col},${row}`);

          // Place pile on both sides
          this.snowPiles.push(new SnowPile(this.getTileCenter(col, row), config.snowPileAmmo));
          this.snowPiles.push(
            new SnowPile(this.getTileCenter(this.cols - 1 - col, row), config.snowPileAmmo),
          );
          placed = true;
        }
      }
    }
  }

  /**
   * Deterministic fallback to guarantee reachability if random generation fails:
   * clears obstacles along horizontal and vertical lines connecting components,
   * maintaining vertical-axis symmetry.
   */
  private ensureReachabilityByClearing(): void {
    const startSpawns = this.getSpawnPositions('team1');
    const startPos = startSpawns[0];
    if (!startPos) return;
    const startTile = worldToTile(startPos, this.tileSize);

    // Carve a horizontal and vertical corridor through the center if needed
    const midRow = Math.floor(this.rows / 2);
    for (let col = 0; col < this.cols; col++) {
      if (this.grid[midRow]?.[col] === 'obstacle') {
        this.setTile(col, midRow, 'ground');
      }
    }

    // Carve from start tile to midRow
    const minRow = Math.min(startTile.row, midRow);
    const maxRow = Math.max(startTile.row, midRow);
    for (let r = minRow; r <= maxRow; r++) {
      if (this.grid[r]?.[startTile.col] === 'obstacle') {
        this.setTile(startTile.col, r, 'ground');
        this.setTile(this.cols - 1 - startTile.col, r, 'ground');
      }
    }

    // For any pile still not reachable, carve straight line to midRow
    for (const pile of this.snowPiles) {
      const tile = pile.getTile(this.tileSize);
      const pMinRow = Math.min(tile.row, midRow);
      const pMaxRow = Math.max(tile.row, midRow);
      for (let r = pMinRow; r <= pMaxRow; r++) {
        if (this.grid[r]?.[tile.col] === 'obstacle') {
          this.setTile(tile.col, r, 'ground');
          this.setTile(this.cols - 1 - tile.col, r, 'ground');
        }
      }
    }
  }

  /** Set a tile type. */
  private setTile(col: number, row: number, type: TileType): void {
    const gridRow = this.grid[row];
    if (gridRow) {
      gridRow[col] = type;
    }
  }
}
