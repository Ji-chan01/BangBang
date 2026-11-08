import { describe, it, expect, beforeEach } from 'vitest';
import { applyDamage } from '../../src/simulation/systems/DamageSystem';
import { Kid, resetKidIdCounter } from '../../src/simulation/Kid';
import { SeededRandom } from '../../src/utils/random';
import type { RoleStats } from '../../src/simulation/types';

const testStats: RoleStats = {
  role: 'thrower',
  hp: 80,
  speed: 60,
  throwRange: 12,
  throwDamage: 30,
  reloadTime: 0.8,
  accuracy: 0.92,
  maxAmmo: 8,
  critChance: 0.1,
};

describe('DamageSystem — applyDamage', () => {
  beforeEach(() => {
    resetKidIdCounter();
  });

  // ─── Normal (non-crit) damage ─────────────────────────────────

  describe('normal damage (no crit)', () => {
    it('deals baseDamage when critChance is 0', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      const rng = new SeededRandom(42);
      const result = applyDamage(kid, 30, 0, rng);

      expect(result.damageDealt).toBe(30);
      expect(result.isCritical).toBe(false);
      expect(result.newHp).toBe(50);
      expect(result.downed).toBe(false);
      expect(result.killedOutright).toBe(false);
      expect(kid.hp).toBe(50);
    });

    it('does not kill when partial damage', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      const rng = new SeededRandom(1);
      const result = applyDamage(kid, 10, 0, rng);
      expect(result.newHp).toBe(70);
      expect(result.downed).toBe(false);
      expect(kid.state).toBe('idle');
    });
  });

  // ─── Critical damage ──────────────────────────────────────────

  describe('critical damage', () => {
    it('deals 2x baseDamage when critChance is 1', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      const rng = new SeededRandom(42);
      const result = applyDamage(kid, 20, 1, rng);

      expect(result.damageDealt).toBe(40); // 20 * 2
      expect(result.isCritical).toBe(true);
      expect(result.newHp).toBe(40); // 80 - 40
      expect(result.downed).toBe(false);
    });
  });

  // ─── Damage that downs ────────────────────────────────────────

  describe('damage that downs a kid', () => {
    it('downs the kid when non-crit damage brings HP to 0', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      const rng = new SeededRandom(42);
      const result = applyDamage(kid, 80, 0, rng);

      expect(result.damageDealt).toBe(80);
      expect(result.isCritical).toBe(false);
      expect(result.newHp).toBe(0);
      expect(result.downed).toBe(true);
      expect(result.killedOutright).toBe(false);
      expect(kid.state).toBe('downed');
    });
  });

  // ─── Critical that kills outright ─────────────────────────────

  describe('critical that kills outright', () => {
    it('kills outright when crit damage brings HP to 0', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      const rng = new SeededRandom(42);
      // 40 * 2 = 80 = maxHp, crit kill
      const result = applyDamage(kid, 40, 1, rng);

      expect(result.damageDealt).toBe(80);
      expect(result.isCritical).toBe(true);
      expect(result.newHp).toBe(0);
      expect(result.downed).toBe(true);
      expect(result.killedOutright).toBe(true);
      expect(kid.state).toBe('out');
    });
  });

  // ─── No damage to inactive kid ────────────────────────────────

  describe('inactive targets', () => {
    it('deals 0 damage to a downed kid', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      kid.takeDamage(80, false); // downed
      const rng = new SeededRandom(42);
      const result = applyDamage(kid, 30, 0, rng);

      expect(result.damageDealt).toBe(0);
      expect(result.isCritical).toBe(false);
      expect(result.newHp).toBe(0);
      expect(result.downed).toBe(false);
      expect(result.killedOutright).toBe(false);
    });

    it('deals 0 damage to an out kid', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      kid.takeDamage(80, true); // out
      const rng = new SeededRandom(42);
      const result = applyDamage(kid, 30, 1, rng);

      expect(result.damageDealt).toBe(0);
      expect(result.isCritical).toBe(false);
      expect(result.newHp).toBe(0);
      expect(result.downed).toBe(false);
      expect(result.killedOutright).toBe(false);
    });
  });

  // ─── DamageResult fields ──────────────────────────────────────

  describe('DamageResult fields are correct', () => {
    it('returns all expected fields for a surviving non-crit hit', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      const rng = new SeededRandom(99);
      const result = applyDamage(kid, 25, 0, rng);

      expect(result).toEqual({
        damageDealt: 25,
        isCritical: false,
        newHp: 55,
        downed: false,
        killedOutright: false,
      });
    });

    it('returns all expected fields for a crit that survives', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      const rng = new SeededRandom(99);
      const result = applyDamage(kid, 10, 1, rng); // 10 * 2 = 20

      expect(result).toEqual({
        damageDealt: 20,
        isCritical: true,
        newHp: 60,
        downed: false,
        killedOutright: false,
      });
    });
  });
});
