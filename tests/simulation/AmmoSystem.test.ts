import { describe, it, expect, beforeEach } from 'vitest';
import { tryPickupAmmo } from '../../src/simulation/systems/AmmoSystem';
import { Kid, resetKidIdCounter } from '../../src/simulation/Kid';
import { SnowPile, resetSnowPileIdCounter } from '../../src/simulation/SnowPile';
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

describe('AmmoSystem — tryPickupAmmo', () => {
  beforeEach(() => {
    resetKidIdCounter();
    resetSnowPileIdCounter();
  });

  // ─── Successful pickup ────────────────────────────────────────

  describe('pickup in range', () => {
    it('picks up ammo when kid is within 50px of a pile', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 3; // needs 5 more to reach maxAmmo=8
      const pile = new SnowPile({ x: 130, y: 100 }, 10); // distance = 30, within range

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(5); // maxAmmo - ammo = 8 - 3 = 5
      expect(kid.ammo).toBe(8);
      expect(pile.remaining).toBe(5); // 10 - 5
    });

    it('picks up when exactly at 50px distance', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;
      const pile = new SnowPile({ x: 150, y: 100 }, 10); // distance = 50, exactly at boundary

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(8); // needs 8, pile has 10
      expect(kid.ammo).toBe(8);
    });

    it('picks up when kid is on top of pile (distance = 0)', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 5;
      const pile = new SnowPile({ x: 100, y: 100 }, 10);

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(3); // 8 - 5 = 3
      expect(kid.ammo).toBe(8);
    });
  });

  // ─── Out of range ─────────────────────────────────────────────

  describe('out of range', () => {
    it('returns 0 when kid is more than 50px from pile', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;
      const pile = new SnowPile({ x: 200, y: 100 }, 10); // distance = 100

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(0);
      expect(kid.ammo).toBe(0);
      expect(pile.remaining).toBe(10);
    });

    it('returns 0 when barely out of range (51px)', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;
      const pile = new SnowPile({ x: 151, y: 100 }, 10); // distance = 51

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(0);
    });
  });

  // ─── Ammo full ────────────────────────────────────────────────

  describe('ammo full', () => {
    it('returns 0 when kid ammo is already at maxAmmo', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      // ammo starts at maxAmmo (8)
      const pile = new SnowPile({ x: 100, y: 100 }, 10);

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(0);
      expect(pile.remaining).toBe(10); // pile untouched
    });
  });

  // ─── Partial pickup (pile has less than needed) ────────────────

  describe('partial pickup', () => {
    it('takes only what the pile has when pile < needed', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0; // needs 8
      const pile = new SnowPile({ x: 100, y: 100 }, 3); // only 3 left

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(3);
      expect(kid.ammo).toBe(3);
      expect(pile.remaining).toBe(0);
    });

    it('takes minimum of needed and available (pile has 2, needs 5)', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 3; // needs 5
      const pile = new SnowPile({ x: 100, y: 100 }, 2);

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(2);
      expect(kid.ammo).toBe(5);
      expect(pile.remaining).toBe(0);
    });
  });

  // ─── Pile depletion ───────────────────────────────────────────

  describe('pile depletion', () => {
    it('depletes pile completely when kid takes all remaining', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 5; // needs 3
      const pile = new SnowPile({ x: 100, y: 100 }, 3);

      tryPickupAmmo(kid, [pile]);
      expect(pile.remaining).toBe(0);
      expect(pile.isDepleted).toBe(true);
    });

    it('returns 0 from an already-depleted pile', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;
      const pile = new SnowPile({ x: 100, y: 100 }, 0); // already empty

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(0);
    });

    it('skips depleted piles and picks up from a non-depleted one', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;
      const depletedPile = new SnowPile({ x: 100, y: 100 }, 0);
      const fullPile = new SnowPile({ x: 110, y: 100 }, 10); // distance = 10, in range

      const taken = tryPickupAmmo(kid, [depletedPile, fullPile]);
      expect(taken).toBe(8);
      expect(kid.ammo).toBe(8);
      expect(depletedPile.remaining).toBe(0);
      expect(fullPile.remaining).toBe(2); // 10 - 8
    });
  });

  // ─── Inactive kid ─────────────────────────────────────────────

  describe('inactive kid', () => {
    it('returns 0 when kid is downed', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;
      kid.takeDamage(80, false); // downed
      const pile = new SnowPile({ x: 100, y: 100 }, 10);

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(0);
      expect(pile.remaining).toBe(10);
    });

    it('returns 0 when kid is out', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;
      kid.takeDamage(80, true); // out
      const pile = new SnowPile({ x: 100, y: 100 }, 10);

      const taken = tryPickupAmmo(kid, [pile]);
      expect(taken).toBe(0);
      expect(pile.remaining).toBe(10);
    });
  });

  // ─── Multiple piles — picks first in-range ───────────────────

  describe('multiple piles', () => {
    it('picks up from the first in-range pile only', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 6; // needs 2
      const pile1 = new SnowPile({ x: 120, y: 100 }, 5); // in range
      const pile2 = new SnowPile({ x: 130, y: 100 }, 5); // also in range

      const taken = tryPickupAmmo(kid, [pile1, pile2]);
      expect(taken).toBe(2);
      expect(pile1.remaining).toBe(3); // took from first
      expect(pile2.remaining).toBe(5); // untouched
    });

    it('returns 0 when no piles are in range', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      kid.ammo = 0;
      const pile1 = new SnowPile({ x: 200, y: 200 }, 10);
      const pile2 = new SnowPile({ x: 300, y: 300 }, 10);

      const taken = tryPickupAmmo(kid, [pile1, pile2]);
      expect(taken).toBe(0);
    });

    it('returns 0 for an empty piles array', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 100, y: 100 });
      kid.ammo = 0;

      const taken = tryPickupAmmo(kid, []);
      expect(taken).toBe(0);
    });
  });
});
