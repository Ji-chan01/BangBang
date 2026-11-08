/**
 * SnowPile — An ammo source on the arena.
 *
 * Kids walk to a snow pile and pick up snowballs. Each pile has a finite
 * supply. When depleted, the pile disappears. New piles spawn mid-round.
 *
 * No Phaser imports — pure simulation data.
 */

import type { SnowPileId, Position, TilePosition } from './types';
import { worldToTile } from '../utils/math';

let nextPileId = 0;

export class SnowPile {
  readonly id: SnowPileId;
  readonly position: Position;
  remaining: number;
  readonly maxAmmo: number;

  /** Is this pile fully depleted? */
  get isDepleted(): boolean {
    return this.remaining <= 0;
  }

  constructor(position: Position, ammo: number) {
    this.id = `pile-${nextPileId++}`;
    this.position = { ...position };
    this.remaining = ammo;
    this.maxAmmo = ammo;
  }

  /** Get the tile position of this pile. */
  getTile(tileSize: number): TilePosition {
    return worldToTile(this.position, tileSize);
  }

  /**
   * Take ammo from this pile.
   * @param requested How many snowballs the kid wants
   * @returns How many were actually taken (may be less if pile runs low)
   */
  take(requested: number): number {
    const taken = Math.min(requested, this.remaining);
    this.remaining -= taken;
    return taken;
  }
}

/** Reset the ID counter (useful for tests). */
export function resetSnowPileIdCounter(): void {
  nextPileId = 0;
}
