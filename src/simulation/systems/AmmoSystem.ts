/**
 * AmmoSystem — Handles ammo pickup from snow piles.
 *
 * Manages the interaction between Kids and SnowPiles:
 * - Checks if a kid is adjacent to a pile
 * - Transfers ammo from pile to kid
 * - Handles pile depletion
 */

import { Kid } from '../Kid';
import { SnowPile } from '../SnowPile';
import { distance } from '../../utils/math';

/** Distance threshold (in pixels) for a kid to pick up from a pile. */
const PICKUP_RANGE = 50;

/**
 * Attempt to pick up ammo from the nearest pile within range.
 *
 * @param kid The kid trying to pick up ammo
 * @param piles All snow piles in the arena
 * @returns The amount of ammo picked up (0 if none available)
 */
export function tryPickupAmmo(kid: Kid, piles: readonly SnowPile[]): number {
  if (!kid.isActive) return 0;
  if (kid.ammo >= kid.maxAmmo) return 0;

  for (const pile of piles) {
    if (pile.isDepleted) continue;

    const dist = distance(kid.position, pile.position);
    if (dist <= PICKUP_RANGE) {
      const wanted = kid.maxAmmo - kid.ammo;
      const taken = pile.take(wanted);
      kid.pickupAmmo(taken);
      return taken;
    }
  }

  return 0;
}

/** Get the pickup range constant (for rendering indicators). */
export function getPickupRange(): number {
  return PICKUP_RANGE;
}
