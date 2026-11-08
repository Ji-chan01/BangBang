/**
 * Core types shared across the entire simulation layer.
 *
 * CONVENTION: All simulation code uses these types.
 * Phaser-specific types (Sprites, GameObjects) must NEVER appear here.
 * This keeps the simulation testable and reusable for multiplayer.
 */

/** A continuous position in the game world (pixels). */
export interface Position {
  x: number;
  y: number;
}

/** A discrete tile coordinate on the arena grid. */
export interface TilePosition {
  col: number;
  row: number;
}

/** Unique identifier for a kid entity. */
export type KidId = string;

/** Unique identifier for a projectile. */
export type ProjectileId = string;

/** Unique identifier for a snow pile. */
export type SnowPileId = string;

/** Which team a kid belongs to. */
export type TeamId = 'team1' | 'team2';

/**
 * Kid lifecycle states.
 *
 * WHY a union type instead of an enum?
 * Union types are simpler in TypeScript — they work with switch/case,
 * are serializable as plain strings (good for multiplayer snapshots),
 * and don't generate extra JavaScript code like enums do.
 */
export type KidState = 'idle' | 'moving' | 'throwing' | 'downed' | 'out';

/** The role types available. Phase 2 only uses 'thrower'. */
export type RoleType = 'thrower' | 'runner' | 'builder';

/** Arena tile types. */
export type TileType = 'ground' | 'obstacle' | 'spawn_team1' | 'spawn_team2';

/**
 * Stats for a role, loaded from roles.json.
 * All numbers are tunable without code changes.
 */
export interface RoleStats {
  role: RoleType;
  hp: number;
  speed: number; // pixels per second
  throwRange: number; // in tiles
  throwDamage: number;
  reloadTime: number; // seconds between throws
  accuracy: number; // 0–1, affects spread
  maxAmmo: number;
  critChance: number; // 0–1
}

/** Configuration for arena generation. */
export interface ArenaConfig {
  cols: number;
  rows: number;
  tileSize: number;
  obstacleDensity: number; // 0–1
  snowPileCount: number;
  snowPileAmmo: number; // snowballs per pile
  snowPileRespawnSeconds: number;
}

/** Result of a damage application. */
export interface DamageResult {
  damageDealt: number;
  isCritical: boolean;
  newHp: number;
  /** Did this hit transition the kid to 'downed'? */
  downed: boolean;
  /** Did this critical hit skip straight to 'out'? */
  killedOutright: boolean;
}
