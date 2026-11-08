/**
 * DamageSystem — Handles applying damage to kids.
 *
 * WHY a standalone function instead of a method on Kid?
 * Separating the damage logic makes it easier to:
 * 1. Unit test damage calculations independently.
 * 2. Add modifiers later (armor, buffs, etc.) without bloating Kid.
 * 3. Log/audit all damage events from one place.
 *
 * This is the "System" in an Entity-Component-System-inspired pattern.
 * The Kid is the entity, its stats are the component, and this is the system.
 */

import type { DamageResult } from '../types';
import { Kid } from '../Kid';
import { SeededRandom } from '../../utils/random';

/**
 * Apply damage from a projectile hit.
 *
 * @param target The kid being hit
 * @param baseDamage Raw damage from the projectile
 * @param critChance Probability of a critical hit (0–1)
 * @param rng Seeded random for determinism
 * @returns The result of the damage application
 */
export function applyDamage(
  target: Kid,
  baseDamage: number,
  critChance: number,
  rng: SeededRandom,
): DamageResult {
  if (!target.isActive) {
    return {
      damageDealt: 0,
      isCritical: false,
      newHp: target.hp,
      downed: false,
      killedOutright: false,
    };
  }

  const isCritical = rng.chance(critChance);
  const damageDealt = isCritical ? baseDamage * 2 : baseDamage;

  const result = target.takeDamage(damageDealt, isCritical);

  return {
    damageDealt,
    isCritical,
    newHp: target.hp,
    downed: result.downed,
    killedOutright: result.killedOutright,
  };
}
