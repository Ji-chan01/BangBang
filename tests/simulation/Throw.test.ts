import { describe, it, expect, beforeEach } from 'vitest';
import { Kid, resetKidIdCounter } from '../../src/simulation/Kid';
import { createThrow } from '../../src/simulation/Throw';
import { resetProjectileIdCounter } from '../../src/simulation/Projectile';
import { SeededRandom } from '../../src/utils/random';
import type { RoleStats } from '../../src/simulation/types';

describe('createThrow', () => {
  const testStats: RoleStats = {
    role: 'thrower',
    hp: 80,
    speed: 60,
    throwRange: 10, // 10 tiles = 400px at 40px/tile
    throwDamage: 30,
    reloadTime: 1.0,
    accuracy: 0.9,
    maxAmmo: 5,
    critChance: 0.2,
  };

  beforeEach(() => {
    resetKidIdCounter();
    resetProjectileIdCounter();
  });

  it('creates a projectile when throw is valid', () => {
    const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
    const rng = new SeededRandom(12345);

    const proj = createThrow(kid, { x: 200, y: 100 }, rng, 40);
    expect(proj).not.toBeNull();
    expect(proj?.throwerId).toBe(kid.id);
    expect(proj?.teamId).toBe('team1');
    expect(proj?.damage).toBe(30);

    // Ammo decremented
    expect(kid.ammo).toBe(4);
    // Kid in throwing state
    expect(kid.state).toBe('throwing');
    expect(kid.throwTimer).toBe(Kid.THROW_DURATION);
  });

  it('returns null if target is out of range', () => {
    const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
    const rng = new SeededRandom(12345);

    // Range is 10 tiles * 40 = 400px. Target at 600px is out of range.
    const proj = createThrow(kid, { x: 600, y: 100 }, rng, 40);
    expect(proj).toBeNull();
    expect(kid.ammo).toBe(5);
    expect(kid.state).toBe('idle');
  });

  it('returns null if kid has no ammo', () => {
    const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
    kid.ammo = 0;
    const rng = new SeededRandom(12345);

    const proj = createThrow(kid, { x: 200, y: 100 }, rng, 40);
    expect(proj).toBeNull();
  });

  it('returns null if kid is on reload cooldown', () => {
    const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
    kid.reloadCooldown = 0.5;
    const rng = new SeededRandom(12345);

    const proj = createThrow(kid, { x: 200, y: 100 }, rng, 40);
    expect(proj).toBeNull();
  });

  it('transitions from throwing to idle after THROW_DURATION in update()', () => {
    const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
    const rng = new SeededRandom(12345);

    createThrow(kid, { x: 200, y: 100 }, rng, 40);
    expect(kid.state).toBe('throwing');

    // Update half the duration
    kid.update(Kid.THROW_DURATION / 2, 40);
    expect(kid.state).toBe('throwing');

    // Update the rest of the duration
    kid.update(Kid.THROW_DURATION / 2 + 0.01, 40);
    expect(kid.state).toBe('idle');
  });
});
