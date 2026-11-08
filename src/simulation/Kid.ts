/**
 * Kid — The core entity in BangBang.
 *
 * WHY A CLASS?
 * A Kid has identity (unique id), mutable state (position, hp, ammo),
 * and behavior (move, throw, take damage). This is a textbook case for
 * object-oriented modeling. The class encapsulates state transitions
 * and enforces invariants (e.g., ammo can't go negative).
 *
 * IMPORTANT: This class has ZERO Phaser imports. It's pure game logic.
 * The Phaser layer reads Kid state each frame and updates sprites accordingly.
 * AI controllers and human input both operate on Kid through the same methods.
 */

import type { KidId, KidState, TeamId, RoleType, RoleStats, Position, TilePosition } from './types';
import { distance, moveToward, worldToTile } from '../utils/math';

let nextKidId = 0;

export class Kid {
  readonly id: KidId;
  readonly teamId: TeamId;
  readonly role: RoleType;

  // ─── Stats (from roles.json, immutable after creation) ───
  readonly maxHp: number;
  readonly speed: number; // px/s
  readonly throwRange: number; // tiles
  readonly throwDamage: number;
  readonly reloadTime: number; // seconds
  readonly accuracy: number;
  readonly maxAmmo: number;
  readonly critChance: number;

  // ─── Mutable state ───
  position: Position;
  hp: number;
  ammo: number;
  state: KidState = 'idle';

  /** Where the kid is moving to (null if idle). */
  moveTarget: Position | null = null;

  /** Path from pathfinding (list of tile positions). */
  path: TilePosition[] = [];

  /** Seconds until the kid can throw again. */
  reloadCooldown = 0;

  /** Seconds remaining in the downed state before going Out. */
  downedTimer = 0;

  /** How long the downed window lasts (seconds). */
  static readonly DOWNED_WINDOW = 5;

  /** Duration of the throwing state/animation (seconds). */
  static readonly THROW_DURATION = 0.2;

  /** Seconds remaining in the throwing state. */
  throwTimer = 0;

  constructor(teamId: TeamId, role: RoleType, stats: RoleStats, spawnPos: Position) {
    this.id = `kid-${nextKidId++}`;
    this.teamId = teamId;
    this.role = role;

    this.maxHp = stats.hp;
    this.speed = stats.speed;
    this.throwRange = stats.throwRange;
    this.throwDamage = stats.throwDamage;
    this.reloadTime = stats.reloadTime;
    this.accuracy = stats.accuracy;
    this.maxAmmo = stats.maxAmmo;
    this.critChance = stats.critChance;

    this.hp = stats.hp;
    this.ammo = stats.maxAmmo;
    this.position = { ...spawnPos };
  }

  /** Get the kid's current tile position. */
  getTile(tileSize: number): TilePosition {
    return worldToTile(this.position, tileSize);
  }

  /** Is this kid able to act (not downed or out)? */
  get isActive(): boolean {
    return this.state !== 'downed' && this.state !== 'out';
  }

  /** Can this kid throw right now? */
  get canThrow(): boolean {
    return this.isActive && this.ammo > 0 && this.reloadCooldown <= 0;
  }

  /**
   * Set a movement target. The kid will move toward it each update().
   * Accepts either a direct position or a path from pathfinding.
   */
  setMoveTarget(target: Position, path?: TilePosition[]): void {
    if (!this.isActive) return;
    this.moveTarget = { ...target };
    this.path = path ? [...path] : [];
    this.state = 'moving';
  }

  /** Stop moving immediately. */
  stopMoving(): void {
    this.moveTarget = null;
    this.path = [];
    if (this.state === 'moving') {
      this.state = 'idle';
    }
  }

  /**
   * Attempt to throw a snowball. Returns true if the throw was initiated.
   * Decrements ammo and starts the reload cooldown and throw timer.
   */
  startThrow(): boolean {
    if (!this.canThrow) return false;
    this.ammo--;
    this.reloadCooldown = this.reloadTime;
    this.throwTimer = Kid.THROW_DURATION;
    this.state = 'throwing';
    return true;
  }

  /** Called after the throw completes to return to idle/moving. */
  finishThrow(): void {
    if (this.state === 'throwing') {
      this.throwTimer = 0;
      this.state = this.moveTarget ? 'moving' : 'idle';
    }
  }

  /**
   * Apply damage to this kid. Returns the result including whether
   * the kid was downed or killed outright by a critical hit.
   */
  takeDamage(amount: number, isCritical: boolean): { downed: boolean; killedOutright: boolean } {
    if (!this.isActive) return { downed: false, killedOutright: false };

    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      if (isCritical) {
        // Critical hit that downs = instant Out (no revive possible)
        this.state = 'out';
        return { downed: true, killedOutright: true };
      } else {
        this.state = 'downed';
        this.downedTimer = Kid.DOWNED_WINDOW;
        this.stopMoving();
        return { downed: true, killedOutright: false };
      }
    }

    return { downed: false, killedOutright: false };
  }

  /**
   * Pick up ammo from a snow pile.
   * Returns the amount actually picked up (limited by maxAmmo).
   */
  pickupAmmo(available: number): number {
    if (!this.isActive) return 0;
    const space = this.maxAmmo - this.ammo;
    const taken = Math.min(space, available);
    this.ammo += taken;
    return taken;
  }

  /**
   * Revive this kid from downed state.
   * Returns true if the revive succeeded.
   */
  revive(): boolean {
    if (this.state !== 'downed') return false;
    this.hp = Math.floor(this.maxHp * 0.5); // Revive at 50% HP
    this.ammo = 0; // No ammo after revive
    this.state = 'idle';
    this.downedTimer = 0;
    return true;
  }

  /**
   * Update the kid's state for one frame.
   * @param dt Delta time in seconds
   * @param tileSize Size of a tile in pixels (for path following)
   */
  update(dt: number, tileSize: number): void {
    // Tick reload cooldown
    if (this.reloadCooldown > 0) {
      this.reloadCooldown = Math.max(0, this.reloadCooldown - dt);
    }

    // Handle throwing timer (simulation-driven throw state)
    if (this.state === 'throwing') {
      this.throwTimer -= dt;
      if (this.throwTimer <= 0) {
        this.finishThrow();
      }
    }

    // Handle downed timer
    if (this.state === 'downed') {
      this.downedTimer -= dt;
      if (this.downedTimer <= 0) {
        this.state = 'out';
      }
      return; // Can't do anything while downed
    }

    if (this.state === 'out') return;

    // Handle movement
    if (this.state === 'moving' && this.moveTarget) {
      this.updateMovement(dt, tileSize);
    }
  }

  /** Internal: move along path toward target. */
  private updateMovement(dt: number, tileSize: number): void {
    if (!this.moveTarget) return;

    const step = this.speed * dt;

    // If we have a path, follow it waypoint by waypoint
    if (this.path.length > 0) {
      const nextWaypoint = this.path[0];
      if (!nextWaypoint) {
        this.stopMoving();
        return;
      }
      const waypointPos: Position = {
        x: nextWaypoint.col * tileSize + tileSize / 2,
        y: nextWaypoint.row * tileSize + tileSize / 2,
      };

      const newPos = moveToward(this.position, waypointPos, step);
      this.position = newPos;

      // Check if we reached this waypoint
      if (distance(newPos, waypointPos) < 2) {
        this.path.shift();
        // If no more waypoints, we've arrived
        if (this.path.length === 0) {
          this.stopMoving();
        }
      }
    } else {
      // Direct movement to target (no path)
      const newPos = moveToward(this.position, this.moveTarget, step);
      this.position = newPos;

      if (distance(newPos, this.moveTarget) < 2) {
        this.stopMoving();
      }
    }
  }
}

/** Reset the ID counter (useful for tests). */
export function resetKidIdCounter(): void {
  nextKidId = 0;
}
