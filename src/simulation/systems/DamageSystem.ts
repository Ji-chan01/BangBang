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
import type { Kid } from '../Kid';

/**
 * Apply damage from a projectile hit.
 *
 * Uses the projectile's `isCritical` flag (decided by the thrower's critChance
 * at throw time) directly, without re-rolling against the target's stats.
 *
 * @param target The kid being hit
 * @param baseDamage Raw damage from the projectile
 * @param isCritical Whether the incoming projectile scored a critical hit
 * @returns The result of the damage application
 */
export function applyDamage(target: Kid, baseDamage: number, isCritical: boolean): DamageResult {
  if (!target.isActive) {
    return {
      damageDealt: 0,
      isCritical: false,
      newHp: target.hp,
      downed: false,
      killedOutright: false,
    };
  }

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
