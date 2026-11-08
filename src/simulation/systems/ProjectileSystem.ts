/**
 * ProjectileSystem — Updates all projectiles and removes spent ones.
 */

import { Projectile } from '../Projectile';

/**
 * Update all projectiles for one frame.
 * Returns a new array with spent projectiles removed.
 *
 * @param projectiles Current list of active projectiles
 * @param dt Delta time in seconds
 * @returns Updated list (spent projectiles filtered out)
 */
export function updateProjectiles(projectiles: Projectile[], dt: number): Projectile[] {
  for (const proj of projectiles) {
    proj.update(dt);
  }

  // Remove projectiles that are spent (hit something or landed)
  return projectiles.filter((p) => !p.spent);
}
