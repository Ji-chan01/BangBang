import { describe, it, expect, beforeEach } from 'vitest';
import { Kid, resetKidIdCounter } from '../../src/simulation/Kid';
import type { RoleStats, Position } from '../../src/simulation/types';

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

const spawnPos: Position = { x: 100, y: 100 };
const TILE_SIZE = 32;

describe('Kid', () => {
  beforeEach(() => {
    resetKidIdCounter();
  });

  // ─── Construction ──────────────────────────────────────────────

  describe('constructor', () => {
    it('assigns a sequential id starting from kid-0', () => {
      const k1 = new Kid('team1', 'thrower', testStats, spawnPos);
      const k2 = new Kid('team2', 'thrower', testStats, spawnPos);
      expect(k1.id).toBe('kid-0');
      expect(k2.id).toBe('kid-1');
    });

    it('sets team, role, and stats from constructor args', () => {
      const kid = new Kid('team2', 'thrower', testStats, spawnPos);
      expect(kid.teamId).toBe('team2');
      expect(kid.role).toBe('thrower');
      expect(kid.maxHp).toBe(80);
      expect(kid.speed).toBe(60);
      expect(kid.throwRange).toBe(12);
      expect(kid.throwDamage).toBe(30);
      expect(kid.reloadTime).toBe(0.8);
      expect(kid.accuracy).toBe(0.92);
      expect(kid.maxAmmo).toBe(8);
      expect(kid.critChance).toBe(0.1);
    });

    it('initialises HP to maxHp and ammo to maxAmmo', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      expect(kid.hp).toBe(80);
      expect(kid.ammo).toBe(8);
    });

    it('copies spawn position (not a reference)', () => {
      const pos = { x: 50, y: 75 };
      const kid = new Kid('team1', 'thrower', testStats, pos);
      pos.x = 999;
      expect(kid.position.x).toBe(50);
      expect(kid.position.y).toBe(75);
    });

    it('starts in idle state with no move target', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      expect(kid.state).toBe('idle');
      expect(kid.moveTarget).toBeNull();
      expect(kid.path).toEqual([]);
      expect(kid.reloadCooldown).toBe(0);
      expect(kid.downedTimer).toBe(0);
    });
  });

  // ─── isActive ──────────────────────────────────────────────────

  describe('isActive', () => {
    it('returns true for idle, moving, and throwing states', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      expect(kid.isActive).toBe(true); // idle

      kid.setMoveTarget({ x: 200, y: 200 });
      expect(kid.isActive).toBe(true); // moving

      kid.stopMoving();
      kid.startThrow();
      expect(kid.isActive).toBe(true); // throwing
    });

    it('returns false for downed state', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, false); // down the kid
      expect(kid.state).toBe('downed');
      expect(kid.isActive).toBe(false);
    });

    it('returns false for out state', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, true); // crit → out
      expect(kid.state).toBe('out');
      expect(kid.isActive).toBe(false);
    });
  });

  // ─── State transitions: movement ──────────────────────────────

  describe('setMoveTarget / stopMoving', () => {
    it('sets state to moving and stores target', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.setMoveTarget({ x: 200, y: 300 });
      expect(kid.state).toBe('moving');
      expect(kid.moveTarget).toEqual({ x: 200, y: 300 });
    });

    it('accepts an optional path', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      const path = [
        { col: 3, row: 4 },
        { col: 5, row: 6 },
      ];
      kid.setMoveTarget({ x: 200, y: 300 }, path);
      expect(kid.path).toEqual(path);
    });

    it('is ignored if kid is not active', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, false); // downed
      kid.setMoveTarget({ x: 200, y: 300 });
      expect(kid.state).toBe('downed');
      expect(kid.moveTarget).toBeNull();
    });

    it('stopMoving clears target and path, returns to idle', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.setMoveTarget({ x: 200, y: 300 }, [{ col: 1, row: 1 }]);
      kid.stopMoving();
      expect(kid.state).toBe('idle');
      expect(kid.moveTarget).toBeNull();
      expect(kid.path).toEqual([]);
    });

    it('stopMoving does not change state if not moving', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.startThrow(); // state = 'throwing'
      kid.stopMoving();
      expect(kid.state).toBe('throwing');
    });
  });

  // ─── Throwing ──────────────────────────────────────────────────

  describe('canThrow / startThrow / finishThrow', () => {
    it('canThrow is true when active, ammo > 0, and no cooldown', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      expect(kid.canThrow).toBe(true);
    });

    it('startThrow decrements ammo, sets cooldown, and sets state to throwing', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      const result = kid.startThrow();
      expect(result).toBe(true);
      expect(kid.ammo).toBe(7);
      expect(kid.reloadCooldown).toBe(0.8);
      expect(kid.state).toBe('throwing');
    });

    it('finishThrow returns to idle if no move target', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.startThrow();
      kid.finishThrow();
      expect(kid.state).toBe('idle');
    });

    it('finishThrow returns to moving if move target exists', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.setMoveTarget({ x: 200, y: 200 });
      kid.startThrow();
      kid.finishThrow();
      expect(kid.state).toBe('moving');
    });

    it('canThrow is false when ammo is 0', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.ammo = 0;
      expect(kid.canThrow).toBe(false);
      expect(kid.startThrow()).toBe(false);
    });

    it('canThrow is false while reload cooldown is active', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.startThrow(); // sets cooldown to 0.8
      kid.finishThrow();
      expect(kid.canThrow).toBe(false);
    });

    it('canThrow becomes true after cooldown expires via update', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.startThrow();
      kid.finishThrow();
      kid.update(0.8, TILE_SIZE); // tick off the 0.8s cooldown
      expect(kid.canThrow).toBe(true);
    });

    it('cannot throw when downed', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, false);
      expect(kid.canThrow).toBe(false);
      expect(kid.startThrow()).toBe(false);
    });

    it('cannot throw when out', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, true);
      expect(kid.canThrow).toBe(false);
      expect(kid.startThrow()).toBe(false);
    });
  });

  // ─── Damage ────────────────────────────────────────────────────

  describe('takeDamage', () => {
    it('reduces HP without downing when damage < HP', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      const result = kid.takeDamage(30, false);
      expect(kid.hp).toBe(50);
      expect(result.downed).toBe(false);
      expect(result.killedOutright).toBe(false);
      expect(kid.state).toBe('idle');
    });

    it('downs the kid when HP reaches 0 with non-crit', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      const result = kid.takeDamage(80, false);
      expect(kid.hp).toBe(0);
      expect(result.downed).toBe(true);
      expect(result.killedOutright).toBe(false);
      expect(kid.state).toBe('downed');
      expect(kid.downedTimer).toBe(5);
    });

    it('kills outright when HP reaches 0 with crit', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      const result = kid.takeDamage(80, true);
      expect(kid.hp).toBe(0);
      expect(result.downed).toBe(true);
      expect(result.killedOutright).toBe(true);
      expect(kid.state).toBe('out');
    });

    it('clamps HP to 0 when damage exceeds HP', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(200, false);
      expect(kid.hp).toBe(0);
    });

    it('is a no-op when kid is downed', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, false); // downed
      const result = kid.takeDamage(10, false);
      expect(result.downed).toBe(false);
      expect(result.killedOutright).toBe(false);
    });

    it('is a no-op when kid is out', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, true); // out
      const result = kid.takeDamage(10, false);
      expect(result.downed).toBe(false);
      expect(result.killedOutright).toBe(false);
    });

    it('stops movement on downing', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.setMoveTarget({ x: 200, y: 200 });
      kid.takeDamage(80, false);
      expect(kid.moveTarget).toBeNull();
      expect(kid.path).toEqual([]);
    });
  });

  // ─── Downed timer ──────────────────────────────────────────────

  describe('downed timer', () => {
    it('transitions from downed to out when timer expires', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, false); // downed, timer = 5
      expect(kid.state).toBe('downed');

      kid.update(4.9, TILE_SIZE);
      expect(kid.state).toBe('downed');

      kid.update(0.2, TILE_SIZE); // total 5.1 — timer expired
      expect(kid.state).toBe('out');
    });

    it('transitions exactly at the boundary', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, false);
      kid.update(5, TILE_SIZE); // exactly 5 seconds
      expect(kid.state).toBe('out');
    });
  });

  // ─── Revive ────────────────────────────────────────────────────

  describe('revive', () => {
    it('restores 50% HP and 0 ammo from downed state', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, false); // downed
      const result = kid.revive();
      expect(result).toBe(true);
      expect(kid.state).toBe('idle');
      expect(kid.hp).toBe(40); // floor(80 * 0.5) = 40
      expect(kid.ammo).toBe(0);
      expect(kid.downedTimer).toBe(0);
    });

    it('returns false if kid is idle (not downed)', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      expect(kid.revive()).toBe(false);
    });

    it('returns false if kid is out', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, true); // out
      expect(kid.revive()).toBe(false);
    });

    it('returns false if kid is moving', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.setMoveTarget({ x: 200, y: 200 });
      expect(kid.revive()).toBe(false);
    });
  });

  // ─── Pickup ammo ───────────────────────────────────────────────

  describe('pickupAmmo', () => {
    it('picks up the full amount when there is room', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.ammo = 3;
      const taken = kid.pickupAmmo(5);
      expect(taken).toBe(5);
      expect(kid.ammo).toBe(8);
    });

    it('picks up only what is needed to reach maxAmmo', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.ammo = 6;
      const taken = kid.pickupAmmo(5);
      expect(taken).toBe(2); // can only hold 2 more
      expect(kid.ammo).toBe(8);
    });

    it('returns 0 when ammo is already at max', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      expect(kid.pickupAmmo(5)).toBe(0);
    });

    it('returns 0 when kid is downed', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.ammo = 0;
      kid.takeDamage(80, false);
      expect(kid.pickupAmmo(5)).toBe(0);
    });

    it('returns 0 when kid is out', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.ammo = 0;
      kid.takeDamage(80, true);
      expect(kid.pickupAmmo(5)).toBe(0);
    });
  });

  // ─── Movement update ──────────────────────────────────────────

  describe('update — movement', () => {
    it('moves position toward target when in moving state', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      kid.setMoveTarget({ x: 300, y: 0 }); // direct movement, no path
      kid.update(1, TILE_SIZE); // speed = 60 px/s, dt = 1s → move 60px
      expect(kid.position.x).toBeCloseTo(60, 1);
      expect(kid.position.y).toBeCloseTo(0, 1);
      expect(kid.state).toBe('moving');
    });

    it('arrives and returns to idle when close enough to target', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 0, y: 0 });
      kid.setMoveTarget({ x: 50, y: 0 });
      kid.update(1, TILE_SIZE); // move 60px, overshoots 50px target
      expect(kid.state).toBe('idle');
      expect(kid.moveTarget).toBeNull();
    });

    it('follows path waypoints', () => {
      const kid = new Kid('team1', 'thrower', testStats, { x: 16, y: 16 });
      // tile (0,0) center = (16,16), tile (1,0) center = (48,16)
      const path = [{ col: 1, row: 0 }];
      kid.setMoveTarget({ x: 48, y: 16 }, path);

      // Move 32px in 1s at speed 60 → won't arrive yet (need 32px, but move 60, should arrive)
      // Actually distance = 32px, step = 60px, so moveToward returns target. Distance < 2 → shift.
      kid.update(1, TILE_SIZE);
      // Path exhausted → stopMoving → idle
      expect(kid.state).toBe('idle');
    });

    it('ticks reload cooldown during update', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.reloadCooldown = 0.5;
      kid.update(0.3, TILE_SIZE);
      expect(kid.reloadCooldown).toBeCloseTo(0.2, 5);
      kid.update(0.3, TILE_SIZE);
      expect(kid.reloadCooldown).toBe(0);
    });

    it('does nothing when state is out', () => {
      const kid = new Kid('team1', 'thrower', testStats, spawnPos);
      kid.takeDamage(80, true);
      const posBefore = { ...kid.position };
      kid.update(1, TILE_SIZE);
      expect(kid.position).toEqual(posBefore);
    });
  });
});
