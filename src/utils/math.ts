/**
 * Math utilities for the game simulation.
 * Pure functions — no side effects, no Phaser imports.
 */

import type { Position, TilePosition } from '../simulation/types';

/** Euclidean distance between two points. */
export function distance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Linear interpolation between a and b by t (0–1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Normalize an angle to 0–2π. */
export function normalizeAngle(angle: number): number {
  const TWO_PI = Math.PI * 2;
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Angle from point a to point b in radians. */
export function angleBetween(a: Position, b: Position): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Move a point toward a target by a fixed step distance.
 * Returns the new position. If step >= remaining distance, returns target.
 */
export function moveToward(from: Position, to: Position, step: number): Position {
  const dist = distance(from, to);
  if (dist <= step || dist === 0) {
    return { x: to.x, y: to.y };
  }
  const ratio = step / dist;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

/**
 * Calculate the Y position of a parabolic arc at progress t (0–1).
 *
 * The arc peaks at t=0.5 with height proportional to the throw distance.
 * This gives the snowball a natural lobbed trajectory.
 *
 * @param t Progress along the arc (0 = start, 1 = end)
 * @param arcHeight Maximum height of the arc in pixels
 * @returns The Y offset (negative = up) to add to the interpolated ground position
 */
export function arcY(t: number, arcHeight: number): number {
  // Parabola: -4h * t * (t - 1) peaks at h when t = 0.5
  return -4 * arcHeight * t * (t - 1);
}

/** Convert a world position (pixels) to a tile coordinate. */
export function worldToTile(pos: Position, tileSize: number): TilePosition {
  return {
    col: Math.floor(pos.x / tileSize),
    row: Math.floor(pos.y / tileSize),
  };
}

/** Convert a tile coordinate to the center of that tile in world space. */
export function tileToWorld(tile: TilePosition, tileSize: number): Position {
  return {
    x: tile.col * tileSize + tileSize / 2,
    y: tile.row * tileSize + tileSize / 2,
  };
}

/** Check if two tile positions are the same. */
export function sameTile(a: TilePosition, b: TilePosition): boolean {
  return a.col === b.col && a.row === b.row;
}

/** Manhattan distance between two tiles. */
export function tileManhattan(a: TilePosition, b: TilePosition): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/** Distance between two tiles in world units. */
export function tileDistance(a: TilePosition, b: TilePosition, tileSize: number): number {
  return distance(tileToWorld(a, tileSize), tileToWorld(b, tileSize));
}
