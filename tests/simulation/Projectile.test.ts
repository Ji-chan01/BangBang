import { describe, it, expect, beforeEach } from 'vitest';
import { Projectile, resetProjectileIdCounter } from '../../src/simulation/Projectile';
import type { Position } from '../../src/simulation/types';

describe('Projectile', () => {
  beforeEach(() => {
    resetProjectileIdCounter();
  });

  const start: Position = { x: 0, y: 0 };
  const target: Position = { x: 300, y: 0 }; // distance = 300

  // ─── Construction / initial state ─────────────────────────────

  describe('constructor', () => {
    it('assigns sequential ids', () => {
      const p1 = new Projectile('kid-0', 'team1', start, target, 30, false);
      const p2 = new Projectile('kid-1', 'team2', start, target, 20, true);
      expect(p1.id).toBe('proj-0');
      expect(p2.id).toBe('proj-1');
    });

    it('stores thrower, team, damage, and isCritical', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, true);
      expect(p.throwerId).toBe('kid-0');
      expect(p.teamId).toBe('team1');
      expect(p.damage).toBe(30);
      expect(p.isCritical).toBe(true);
    });

    it('starts at progress 0 and spent false', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      expect(p.progress).toBe(0);
      expect(p.spent).toBe(false);
    });

    it('currentPosition starts at the start position', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      expect(p.currentPosition).toEqual(start);
    });

    it('copies start and target positions (no shared references)', () => {
      const s = { x: 10, y: 20 };
      const t = { x: 100, y: 200 };
      const p = new Projectile('kid-0', 'team1', s, t, 30, false);
      s.x = 999;
      t.x = 999;
      expect(p.start.x).toBe(10);
      expect(p.target.x).toBe(100);
    });

    it('calculates flightTime as distance / 300', () => {
      // distance = 300, BASE_SPEED = 300
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      expect(p.flightTime).toBeCloseTo(1.0, 5); // 300 / 300 = 1
    });

    it('calculates arcHeight as distance * 0.3', () => {
      // distance = 300, arcHeight = min(300*0.3, 80) = min(90, 80) = 80
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      expect(p.arcHeight).toBe(80); // capped
    });

    it('arcHeight is distance * 0.3 for short throws', () => {
      const shortTarget: Position = { x: 100, y: 0 }; // distance = 100
      const p = new Projectile('kid-0', 'team1', start, shortTarget, 30, false);
      expect(p.arcHeight).toBeCloseTo(30, 5); // 100 * 0.3 = 30, < 80 so not capped
    });
  });

  // ─── update ────────────────────────────────────────────────────

  describe('update', () => {
    it('advances progress proportionally to dt / flightTime', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      // flightTime = 1.0
      p.update(0.25);
      expect(p.progress).toBeCloseTo(0.25, 5);
      expect(p.spent).toBe(false);
    });

    it('interpolates currentPosition during flight', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      p.update(0.5); // progress = 0.5
      expect(p.currentPosition.x).toBeCloseTo(150, 1);
      expect(p.currentPosition.y).toBeCloseTo(0, 1);
    });

    it('returns false while still in flight', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      const reached = p.update(0.5);
      expect(reached).toBe(false);
    });

    it('returns true and sets spent when reaching target', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      const reached = p.update(1.0); // exactly flightTime
      expect(reached).toBe(true);
      expect(p.spent).toBe(true);
      expect(p.progress).toBe(1);
      expect(p.currentPosition).toEqual(target);
    });

    it('clamps progress to 1 even if dt overshoots', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      p.update(2.0); // way past flightTime
      expect(p.progress).toBe(1);
      expect(p.spent).toBe(true);
    });

    it('returns false after already spent', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      p.update(1.0); // spent
      const result = p.update(0.5); // update again
      expect(result).toBe(false);
    });

    it('accumulates progress across multiple updates', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      p.update(0.3);
      p.update(0.3);
      expect(p.progress).toBeCloseTo(0.6, 5);
      p.update(0.5); // should finish
      expect(p.progress).toBe(1);
      expect(p.spent).toBe(true);
    });
  });

  // ─── hit ───────────────────────────────────────────────────────

  describe('hit', () => {
    it('marks the projectile as spent', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      expect(p.spent).toBe(false);
      p.hit();
      expect(p.spent).toBe(true);
    });
  });

  // ─── Arc offset / visualY ─────────────────────────────────────

  describe('arc offset and visualY', () => {
    it('arc offset is 0 at start (progress=0)', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      expect(p.currentArcOffset).toBe(0);
    });

    it('arc offset peaks at mid-flight (progress=0.5)', () => {
      const shortTarget: Position = { x: 100, y: 0 }; // arcHeight = 30
      const p = new Projectile('kid-0', 'team1', start, shortTarget, 30, false);
      p.update(p.flightTime * 0.5); // advance to progress ≈ 0.5
      // arcY formula: -4 * arcHeight * t * (t-1) at t=0.5 = -4 * 30 * 0.5 * (-0.5) = 30
      expect(p.currentArcOffset).toBeCloseTo(30, 1);
    });

    it('arc offset is 0 at end (progress=1)', () => {
      const p = new Projectile('kid-0', 'team1', start, target, 30, false);
      p.update(p.flightTime); // progress = 1
      expect(p.currentArcOffset).toBe(0);
    });

    it('visualY is below currentPosition.y at mid-flight (arc goes up)', () => {
      // "up" on screen means lower Y, so visualY < currentPosition.y
      const shortTarget: Position = { x: 100, y: 100 };
      const p = new Projectile('kid-0', 'team1', { x: 0, y: 100 }, shortTarget, 30, false);
      p.update(p.flightTime * 0.5);
      // arcOffset > 0 at mid-flight, so visualY = currentPosition.y - arcOffset < currentPosition.y
      expect(p.visualY).toBeLessThan(p.currentPosition.y);
    });
  });

  // ─── Very long throws cap arcHeight ────────────────────────────

  describe('arcHeight cap', () => {
    it('caps arcHeight at 80 for very long throws', () => {
      const farTarget: Position = { x: 1000, y: 0 }; // distance = 1000
      const p = new Projectile('kid-0', 'team1', start, farTarget, 30, false);
      // 1000 * 0.3 = 300, capped to 80
      expect(p.arcHeight).toBe(80);
    });

    it('does not cap arcHeight for short throws', () => {
      const nearTarget: Position = { x: 50, y: 0 }; // distance = 50
      const p = new Projectile('kid-0', 'team1', start, nearTarget, 30, false);
      // 50 * 0.3 = 15 < 80
      expect(p.arcHeight).toBeCloseTo(15, 5);
    });
  });
});
