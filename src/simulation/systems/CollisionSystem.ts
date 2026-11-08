/**
 * CollisionSystem — Checks for projectile collisions with kids.
 *
 * Each frame, we check all in-flight projectiles against all active kids.
 * If a projectile's ground position is within hit range of a kid, it's a hit.
 *
 * Note: We check against ground position (not visual/arc position) because
 * the arc is purely visual. The snowball's "shadow" on the ground is what
 * determines if it hits — this feels natural for a top-down game.
 */

import { Projectile } from '../Projectile';
import { Kid } from '../Kid';
import { distance } from '../../utils/math';

/** Hit radius in pixels. A projectile "hits" if within this distance of a kid's center. */
const HIT_RADIUS = 24;

export interface CollisionResult {
  projectile: Projectile;
  hitKid: Kid;
}

/**
 * Check all projectiles against all kids for collisions.
 * Returns a list of hits found this frame.
 *
 * Rules:
 * - A projectile can only hit kids on the opposing team (friendly fire IS on,
 *   but we still skip the thrower themselves).
 *   CORRECTION from design doc: friendly fire is ON, so we check ALL kids
 *   except the thrower.
 * - A projectile is consumed on first hit (no piercing).
 * - Only checks projectiles that have progressed past 10% (avoids self-hits at spawn).
 */
export function checkCollisions(
  projectiles: readonly Projectile[],
  kids: readonly Kid[],
): CollisionResult[] {
  const results: CollisionResult[] = [];

  for (const proj of projectiles) {
    if (proj.spent) continue;
    if (proj.progress < 0.1) continue; // Skip early flight to avoid self-hit

    for (const kid of kids) {
      if (!kid.isActive) continue;
      if (kid.id === proj.throwerId) continue; // Can't hit yourself

      const dist = distance(proj.currentPosition, kid.position);
      if (dist <= HIT_RADIUS) {
        proj.hit();
        results.push({ projectile: proj, hitKid: kid });
        break; // Projectile consumed, stop checking other kids
      }
    }
  }

  return results;
}
