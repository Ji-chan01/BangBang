/**
 * Throw simulation logic.
 *
 * Pure simulation function that calculates throw range, accuracy spread,
 * critical hits, decrements ammo, and instantiates the Projectile.
 *
 * Used by both human player input and enemy AI controllers so both
 * follow the exact same game rules and RNG.
 */

import type { Position } from './types';
import type { Kid } from './Kid';
import { Projectile } from './Projectile';
import type { SeededRandom } from '../utils/random';
import { distance } from '../utils/math';

/**
 * Attempt to throw a snowball from a kid towards a target position.
 *
 * @param thrower The kid throwing the snowball
 * @param targetPos Target world coordinates (pixels)
 * @param rng PRNG for deterministic accuracy spread and crit rolls
 * @param tileSize Tile size in pixels (default: 40)
 * @returns The newly spawned Projectile, or null if throw cannot be executed
 */
export function createThrow(
  thrower: Kid,
  targetPos: Position,
  rng: SeededRandom,
  tileSize = 40,
): Projectile | null {
  if (!thrower.canThrow) return null;

  // Range check: throwRange is in tiles
  const maxRangePx = thrower.throwRange * tileSize;
  if (distance(thrower.position, targetPos) > maxRangePx) {
    return null;
  }

  // Attempt to start throw (decrements ammo, sets cooldown & throwTimer)
  if (!thrower.startThrow()) {
    return null;
  }

  // Check critical hit
  const isCritical = rng.chance(thrower.critChance);

  // Apply accuracy spread: lower accuracy = more random deviation
  const spread = (1 - thrower.accuracy) * tileSize;
  const spreadTargetPos: Position = {
    x: targetPos.x + rng.float(-spread, spread),
    y: targetPos.y + rng.float(-spread, spread),
  };

  return new Projectile(
    thrower.id,
    thrower.teamId,
    { ...thrower.position },
    spreadTargetPos,
    thrower.throwDamage,
    isCritical,
  );
}
