/**
 * Projectile — A snowball in flight.
 *
 * Represents a thrown snowball traveling in a parabolic arc from
 * the thrower to a target position. The simulation updates its
 * progress each tick, and the collision system checks for hits.
 *
 * No Phaser imports — pure simulation data.
 */

import type { ProjectileId, KidId, TeamId, Position } from './types';
import { lerp, arcY, distance } from '../utils/math';

let nextProjectileId = 0;

export class Projectile {
  readonly id: ProjectileId;
  readonly throwerId: KidId;
  readonly teamId: TeamId;
  readonly start: Position;
  readonly target: Position;
  readonly damage: number;
  readonly isCritical: boolean;

  /** Total flight time in seconds. */
  readonly flightTime: number;

  /** Maximum arc height in pixels. */
  readonly arcHeight: number;

  /** Progress from 0 (just thrown) to 1 (arrived). */
  progress = 0;

  /** Has this projectile hit something or landed? */
  spent = false;

  /** Current interpolated position (updated each tick). */
  currentPosition: Position;

  /** Current Y offset from the arc (for rendering the shadow separately). */
  currentArcOffset = 0;

  /** Projectile speed in px/s. Base speed, scaled by distance. */
  private static readonly BASE_SPEED = 300;

  constructor(
    throwerId: KidId,
    teamId: TeamId,
    start: Position,
    target: Position,
    damage: number,
    isCritical: boolean,
  ) {
    this.id = `proj-${nextProjectileId++}`;
    this.throwerId = throwerId;
    this.teamId = teamId;
    this.start = { ...start };
    this.target = { ...target };
    this.damage = damage;
    this.isCritical = isCritical;
    this.currentPosition = { ...start };

    // Calculate flight time based on distance
    const dist = distance(start, target);
    this.flightTime = dist / Projectile.BASE_SPEED;

    // Arc height proportional to distance (more distance = higher arc)
    // Capped so very long throws don't go absurdly high
    this.arcHeight = Math.min(dist * 0.3, 80);
  }

  /**
   * Update position along the arc.
   * @param dt Delta time in seconds
   * @returns true if the projectile reached its target this frame
   */
  update(dt: number): boolean {
    if (this.spent) return false;

    this.progress += dt / this.flightTime;

    if (this.progress >= 1) {
      this.progress = 1;
      this.currentPosition = { ...this.target };
      this.currentArcOffset = 0;
      this.spent = true;
      return true; // Reached target
    }

    // Interpolate ground position
    this.currentPosition = {
      x: lerp(this.start.x, this.target.x, this.progress),
      y: lerp(this.start.y, this.target.y, this.progress),
    };

    // Calculate arc offset (negative = up)
    this.currentArcOffset = arcY(this.progress, this.arcHeight);

    return false;
  }

  /** Mark this projectile as having hit something. */
  hit(): void {
    this.spent = true;
  }

  /** Get the visual Y position (ground Y minus arc offset). */
  get visualY(): number {
    return this.currentPosition.y - this.currentArcOffset;
  }
}

/** Reset the ID counter (useful for tests). */
export function resetProjectileIdCounter(): void {
  nextProjectileId = 0;
}
