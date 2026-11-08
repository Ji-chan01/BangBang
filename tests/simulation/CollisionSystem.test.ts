import { describe, it, expect, beforeEach } from 'vitest';
import { checkCollisions } from '../../src/simulation/systems/CollisionSystem';
import { Projectile, resetProjectileIdCounter } from '../../src/simulation/Projectile';
import { Kid, resetKidIdCounter } from '../../src/simulation/Kid';
import type { RoleStats } from '../../src/simulation/types';

describe('CollisionSystem', () => {
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

  beforeEach(() => {
    resetKidIdCounter();
    resetProjectileIdCounter();
  });

  it('detects collision when projectile is within hit radius of opposing kid', () => {
    const thrower = new Kid('team1', 'thrower', testStats, { x: 50, y: 100 });
    const target = new Kid('team2', 'thrower', testStats, { x: 200, y: 100 });

    const proj = new Projectile(
      thrower.id,
      thrower.teamId,
      thrower.position,
      target.position,
      30,
      false,
    );
    // Simulate flight to target
    proj.currentPosition = { x: 205, y: 100 }; // 5px away <= 24px HIT_RADIUS
    proj.progress = 0.9;

    const hits = checkCollisions([proj], [thrower, target]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.projectile.id).toBe(proj.id);
    expect(hits[0]?.hitKid.id).toBe(target.id);
    expect(proj.spent).toBe(true);
  });

  it('friendly fire: projectile hits teammate if within hit radius (not the thrower)', () => {
    const thrower = new Kid('team1', 'thrower', testStats, { x: 50, y: 100 });
    const teammate = new Kid('team1', 'thrower', testStats, { x: 150, y: 100 });

    const proj = new Projectile(
      thrower.id,
      thrower.teamId,
      thrower.position,
      { x: 300, y: 100 },
      30,
      false,
    );
    // Projectile flies past teammate
    proj.currentPosition = { x: 155, y: 100 };
    proj.progress = 0.4;

    const hits = checkCollisions([proj], [thrower, teammate]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.hitKid.id).toBe(teammate.id);
  });

  it('thrower immunity: projectile cannot collide with the thrower who fired it', () => {
    const thrower = new Kid('team1', 'thrower', testStats, { x: 50, y: 100 });

    const proj = new Projectile(
      thrower.id,
      thrower.teamId,
      thrower.position,
      { x: 200, y: 100 },
      30,
      false,
    );
    proj.currentPosition = { x: 50, y: 100 };
    proj.progress = 0.5;

    const hits = checkCollisions([proj], [thrower]);
    expect(hits).toHaveLength(0);
    expect(proj.spent).toBe(false);
  });

  it('skips collisions when projectile progress < 0.1 to avoid spawn collision', () => {
    const thrower = new Kid('team1', 'thrower', testStats, { x: 50, y: 100 });
    const closeKid = new Kid('team2', 'thrower', testStats, { x: 55, y: 100 });

    const proj = new Projectile(
      thrower.id,
      thrower.teamId,
      thrower.position,
      closeKid.position,
      30,
      false,
    );
    proj.currentPosition = { x: 52, y: 100 };
    proj.progress = 0.05; // < 0.1

    const hits = checkCollisions([proj], [thrower, closeKid]);
    expect(hits).toHaveLength(0);
    expect(proj.spent).toBe(false);
  });

  it('ignores already spent projectiles', () => {
    const thrower = new Kid('team1', 'thrower', testStats, { x: 50, y: 100 });
    const target = new Kid('team2', 'thrower', testStats, { x: 200, y: 100 });

    const proj = new Projectile(
      thrower.id,
      thrower.teamId,
      thrower.position,
      target.position,
      30,
      false,
    );
    proj.currentPosition = { x: 200, y: 100 };
    proj.progress = 0.9;
    proj.spent = true;

    const hits = checkCollisions([proj], [thrower, target]);
    expect(hits).toHaveLength(0);
  });

  it('ignores inactive (downed or out) kids', () => {
    const thrower = new Kid('team1', 'thrower', testStats, { x: 50, y: 100 });
    const downedKid = new Kid('team2', 'thrower', testStats, { x: 200, y: 100 });
    downedKid.takeDamage(100, false); // downs the kid
    expect(downedKid.state).toBe('downed');

    const proj = new Projectile(
      thrower.id,
      thrower.teamId,
      thrower.position,
      downedKid.position,
      30,
      false,
    );
    proj.currentPosition = { x: 200, y: 100 };
    proj.progress = 0.9;

    const hits = checkCollisions([proj], [thrower, downedKid]);
    expect(hits).toHaveLength(0);
    expect(proj.spent).toBe(false);
  });

  it('consumes projectile on first hit (no piercing through multiple kids)', () => {
    const thrower = new Kid('team1', 'thrower', testStats, { x: 50, y: 100 });
    const kidA = new Kid('team2', 'thrower', testStats, { x: 195, y: 100 });
    const kidB = new Kid('team2', 'thrower', testStats, { x: 205, y: 100 });

    const proj = new Projectile(
      thrower.id,
      thrower.teamId,
      thrower.position,
      { x: 200, y: 100 },
      30,
      false,
    );
    proj.currentPosition = { x: 200, y: 100 };
    proj.progress = 0.8;

    const hits = checkCollisions([proj], [thrower, kidA, kidB]);
    expect(hits).toHaveLength(1);
    expect(proj.spent).toBe(true);
  });
});
