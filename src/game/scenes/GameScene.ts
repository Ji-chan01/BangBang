/**
 * GameScene — The main gameplay scene for BangBang Phase 2.
 *
 * RESPONSIBILITY:
 * 1. Initialize the Arena, Kids, and SnowPiles (simulation layer).
 * 2. Create Phaser sprite wrappers that read from the simulation each frame.
 * 3. Handle player input (tap ground → move, tap enemy → throw, tap pile → pickup).
 * 4. Run the game loop: update kids, update projectiles, check collisions, apply damage.
 * 5. Emit events to React for HUD updates.
 *
 * ARCHITECTURE NOTE:
 * The simulation layer (Kid, Arena, Projectile, etc.) has ZERO Phaser imports.
 * This scene is the "glue" that reads simulation state and writes it to Phaser
 * game objects. Input flows: Player tap → GameScene → simulation method call.
 * Visual feedback flows: simulation state → sprite.syncToSimulation().
 */

import Phaser from 'phaser';
import { EventBus } from '../../events/EventBus';
import { Arena } from '../../simulation/Arena';
import { Kid } from '../../simulation/Kid';
import { Projectile } from '../../simulation/Projectile';
import type { RoleStats, Position } from '../../simulation/types';
import { KidSprite } from '../entities/KidSprite';
import { SnowballSprite } from '../entities/SnowballSprite';
import { SnowPileSprite } from '../entities/SnowPileSprite';
import { checkCollisions } from '../../simulation/systems/CollisionSystem';
import { applyDamage } from '../../simulation/systems/DamageSystem';
import { updateProjectiles } from '../../simulation/systems/ProjectileSystem';
import { tryPickupAmmo } from '../../simulation/systems/AmmoSystem';
import { createThrow } from '../../simulation/Throw';
import { Pathfinder } from '../../utils/pathfinding';
import { SeededRandom } from '../../utils/random';
import { distance, worldToTile } from '../../utils/math';
import arenaConfig from '../../config/arena.json';
import rolesConfig from '../../config/roles.json';

/**
 * Simple enemy "AI" for Phase 2.
 * The enemy just periodically throws at the nearest player kid.
 * Real AI is Phase 4 — this is a punching bag that fights back a little.
 */
interface EnemyAI {
  kid: Kid;
  thinkTimer: number;
  /** Seconds between AI "decisions" */
  thinkInterval: number;
}

export class GameScene extends Phaser.Scene {
  // ─── Simulation state ───
  private arena!: Arena;
  private playerKids: Kid[] = [];
  private enemyKids: Kid[] = [];
  private allKids: Kid[] = [];
  private projectiles: Projectile[] = [];
  private pathfinder!: Pathfinder;
  private rng!: SeededRandom;

  // ─── Phaser sprites ───
  private kidSprites: Map<string, KidSprite> = new Map();
  private snowballSprites: SnowballSprite[] = [];
  private pileSprites: SnowPileSprite[] = [];

  // ─── Player state ───
  /** The kid currently being controlled by the player. */
  private activeKid!: Kid;

  // ─── Enemy AI ───
  private enemyAIs: EnemyAI[] = [];

  // ─── Cleanup ───
  private eventUnsubs: Array<() => void> = [];

  // ─── Round state ───
  private roundOver = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.roundOver = false;

    // Seeded RNG for deterministic arena generation and damage rolls
    const seed = Date.now();
    this.rng = new SeededRandom(seed);

    // ─── 1. Create Arena ───
    this.arena = new Arena(arenaConfig, seed);
    this.renderArenaTiles();

    // ─── 2. Set up pathfinder ───
    this.pathfinder = new Pathfinder();
    this.pathfinder.setGrid(this.arena.getWalkabilityGrid());

    // ─── 3. Create player kid (Phase 2: one thrower) ───
    const throwerStats = rolesConfig.thrower as RoleStats;
    const playerSpawns = this.arena.getSpawnPositions('team1');
    const playerSpawn = playerSpawns[0] ?? { x: 60, y: 320 };
    const playerKid = new Kid('team1', 'thrower', throwerStats, playerSpawn);
    this.playerKids.push(playerKid);
    this.activeKid = playerKid;

    // ─── 4. Create enemy kids (Phase 2: two throwers) ───
    const enemySpawns = this.arena.getSpawnPositions('team2');
    for (let i = 0; i < 2; i++) {
      const spawn = enemySpawns[i] ?? { x: 900, y: 240 + i * 160 };
      const enemyKid = new Kid('team2', 'thrower', throwerStats, spawn);
      this.enemyKids.push(enemyKid);
      this.enemyAIs.push({
        kid: enemyKid,
        thinkTimer: 1 + this.rng.float(0, 1), // Stagger initial think times
        thinkInterval: 1.5 + this.rng.float(0, 1),
      });
    }

    this.allKids = [...this.playerKids, ...this.enemyKids];

    // ─── 5. Create sprites for all entities ───
    this.createKidSprites();
    this.createPileSprites();

    // Mark the player kid as selected
    const activeSprite = this.kidSprites.get(this.activeKid.id);
    if (activeSprite) activeSprite.isSelected = true;

    // ─── 6. Set up input ───
    this.setupInput();

    // ─── 7. Subscribe to EventBus ───
    this.setupEventBusListeners();

    // ─── 8. Emit initial HUD state ───
    this.emitHudUpdate();

    // ─── 9. Notify React the scene is ready ───
    EventBus.emit('scene:ready');

    // ─── Cleanup: use the SHUTDOWN + DESTROY pattern ───
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      for (const unsub of this.eventUnsubs) {
        unsub();
      }
      this.eventUnsubs = [];
    };
    // Phaser emits 'shutdown' when scene.stop()/restart() is called.
    // Phaser emits 'destroy' when game.destroy(true) is called (React unmount).
    // Both must be handled so EventBus subscriptions don't leak.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  /**
   * Main game loop — called every frame by Phaser.
   * @param _time Total elapsed time (not used)
   * @param delta Milliseconds since last frame
   */
  update(_time: number, delta: number): void {
    if (this.roundOver) return;

    // Convert delta from ms to seconds for simulation
    const dt = delta / 1000;

    // 1. Update all kids (movement, cooldowns, downed timers)
    for (const kid of this.allKids) {
      const prevState = kid.state;
      kid.update(dt, this.arena.tileSize);

      // Detect state transitions and emit events
      if (kid.state !== prevState) {
        EventBus.emit('kid:state-changed', { kidId: kid.id, state: kid.state });
        if (kid.state === 'downed') {
          EventBus.emit('kid:downed', { kidId: kid.id, teamId: kid.teamId });
        }
        if (kid.state === 'out') {
          EventBus.emit('kid:out', { kidId: kid.id, teamId: kid.teamId });
        }
      }
    }

    // 2. Run enemy AI
    this.updateEnemyAI(dt);

    // 3. Update projectiles
    this.projectiles = updateProjectiles(this.projectiles, dt);

    // 4. Check collisions
    const hits = checkCollisions(this.projectiles, this.allKids);
    for (const { projectile, hitKid } of hits) {
      const result = applyDamage(hitKid, projectile.damage, projectile.isCritical);
      EventBus.emit('projectile:hit', {
        projectileId: projectile.id,
        targetId: hitKid.id,
        damage: result.damageDealt,
        isCritical: result.isCritical,
      });
      if (result.downed || result.killedOutright) {
        EventBus.emit('kid:hp-changed', {
          kidId: hitKid.id,
          hp: hitKid.hp,
          maxHp: hitKid.maxHp,
        });
      }
    }

    // 5. Auto-pickup ammo when near a pile (for the player kid)
    for (const kid of this.playerKids) {
      if (!kid.isActive) continue;
      const prevAmmo = kid.ammo;
      const picked = tryPickupAmmo(kid, this.arena.snowPiles);
      if (picked > 0) {
        EventBus.emit('ammo:pickup', { kidId: kid.id, amount: picked });
        EventBus.emit('kid:ammo-changed', {
          kidId: kid.id,
          ammo: kid.ammo,
          maxAmmo: kid.maxAmmo,
        });
        // Check if any pile was depleted
        for (const pile of this.arena.snowPiles) {
          if (pile.isDepleted && pile.remaining === 0 && prevAmmo !== kid.ammo) {
            EventBus.emit('snowpile:depleted', { pileId: pile.id });
          }
        }
      }
    }

    // 6. Sync all sprites to simulation state
    for (const sprite of this.kidSprites.values()) {
      sprite.syncToSimulation();
    }
    for (const sprite of this.pileSprites) {
      sprite.syncToSimulation();
    }
    // Clean up spent snowball sprites, sync live ones
    this.snowballSprites = this.snowballSprites.filter((s) => {
      s.syncToSimulation();
      if (s.projectile.spent) {
        s.destroy();
        return false;
      }
      return true;
    });

    // 7. Emit HUD update for active kid
    this.emitHudUpdate();

    // 8. Check win/lose conditions
    this.checkRoundEnd();
  }

  // ──────────────────────────────────────────
  // Arena rendering
  // ──────────────────────────────────────────

  /** Render the arena grid as colored rectangles. */
  private renderArenaTiles(): void {
    const { cols, rows, tileSize } = this.arena;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileType = this.arena.getTile(col, row);
        const x = col * tileSize + tileSize / 2;
        const y = row * tileSize + tileSize / 2;

        let color: number;
        switch (tileType) {
          case 'obstacle':
            color = 0x8b7355; // Brown
            break;
          case 'spawn_team1':
            color = 0x4a7c59; // Slightly lighter green
            break;
          case 'spawn_team2':
            color = 0x4a7c59;
            break;
          default:
            color = 0x3a6b4a; // Ground green
        }

        const tile = this.add.rectangle(x, y, tileSize - 1, tileSize - 1, color);
        tile.setDepth(-1); // Below everything
      }
    }
  }

  // ──────────────────────────────────────────
  // Entity sprite creation
  // ──────────────────────────────────────────

  private createKidSprites(): void {
    for (const kid of this.allKids) {
      const sprite = new KidSprite(this, kid);
      this.kidSprites.set(kid.id, sprite);
    }
  }

  private createPileSprites(): void {
    for (const pile of this.arena.snowPiles) {
      const sprite = new SnowPileSprite(this, pile);
      this.pileSprites.push(sprite);
    }
  }

  private createSnowballSprite(projectile: Projectile): void {
    const sprite = new SnowballSprite(this, projectile);
    this.snowballSprites.push(sprite);
  }

  // ──────────────────────────────────────────
  // Input handling
  // ──────────────────────────────────────────

  /**
   * Set up touch/click input.
   *
   * INPUT STRATEGY (mobile-first):
   * - Tap on ground → move the active kid there (pathfinding)
   * - Tap on enemy kid → throw snowball at them
   * - Tap on snow pile → move to the pile (auto-pickup when in range)
   *
   * We register a single pointerdown on the scene's input, then check
   * what was tapped using Phaser's hit testing.
   */
  private setupInput(): void {
    // Tap on enemy kid → throw
    for (const [_kidId, sprite] of this.kidSprites) {
      const kid = sprite.kid;
      if (kid.teamId === 'team2') {
        sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          pointer.event.stopPropagation();
          this.handleThrowAtTarget(kid);
        });
      }
    }

    // Tap on snow pile → move to it
    for (const pileSprite of this.pileSprites) {
      pileSprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.handleMoveToPosition(pileSprite.pile.position);
      });
    }

    // Tap on empty ground → move there
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Convert screen coordinates to world coordinates
      // (in case camera has moved, though Phase 2 uses fixed camera)
      const worldPoint: Position = { x: pointer.worldX, y: pointer.worldY };
      this.handleMoveToPosition(worldPoint);
    });
  }

  /**
   * Handle moving the active kid to a position using pathfinding.
   */
  private async handleMoveToPosition(target: Position): Promise<void> {
    if (!this.activeKid.isActive) return;

    const startTile = worldToTile(this.activeKid.position, this.arena.tileSize);
    const endTile = worldToTile(target, this.arena.tileSize);

    // Don't pathfind to obstacle tiles
    if (!this.arena.isWalkable(endTile.col, endTile.row)) return;

    const path = await this.pathfinder.findPath(startTile, endTile);
    if (path.length > 0) {
      this.activeKid.setMoveTarget(target, path);
    }
  }

  /**
   * Handle throwing a snowball at an enemy kid.
   */
  private handleThrowAtTarget(target: Kid): void {
    if (!target.isActive) return;

    const proj = createThrow(this.activeKid, target.position, this.rng, this.arena.tileSize);
    if (!proj) return;

    this.projectiles.push(proj);
    this.createSnowballSprite(proj);

    // Update ammo HUD
    EventBus.emit('kid:ammo-changed', {
      kidId: this.activeKid.id,
      ammo: this.activeKid.ammo,
      maxAmmo: this.activeKid.maxAmmo,
    });
  }

  // ──────────────────────────────────────────
  // Enemy AI (Phase 2: simple auto-throw)
  // ──────────────────────────────────────────

  /**
   * Minimal enemy AI: periodically throw at the nearest active player kid.
   * Real AI behavior (flanking, targeting Builder, etc.) is Phase 4.
   */
  private updateEnemyAI(dt: number): void {
    for (const ai of this.enemyAIs) {
      if (!ai.kid.isActive) continue;

      ai.thinkTimer -= dt;
      if (ai.thinkTimer > 0) continue;
      ai.thinkTimer = ai.thinkInterval;

      // Find nearest active player kid
      let nearestPlayer: Kid | null = null;
      let nearestDist = Infinity;
      for (const pk of this.playerKids) {
        if (!pk.isActive) continue;
        const d = distance(ai.kid.position, pk.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPlayer = pk;
        }
      }

      if (!nearestPlayer) continue;

      // Throw at target using pure simulation logic
      const proj = createThrow(ai.kid, nearestPlayer.position, this.rng, this.arena.tileSize);
      if (!proj) continue;

      this.projectiles.push(proj);
      this.createSnowballSprite(proj);
    }
  }

  // ──────────────────────────────────────────
  // EventBus listeners
  // ──────────────────────────────────────────

  private setupEventBusListeners(): void {
    // React can request a game start (for future level system)
    const unsubStart = EventBus.on('game:start', (_payload) => {
      // Phase 2: restart the scene
      this.scene.restart();
    });
    this.eventUnsubs.push(unsubStart);
  }

  // ──────────────────────────────────────────
  // HUD communication
  // ──────────────────────────────────────────

  private emitHudUpdate(): void {
    const kid = this.activeKid;
    EventBus.emit('kid:hp-changed', {
      kidId: kid.id,
      hp: kid.hp,
      maxHp: kid.maxHp,
    });
    EventBus.emit('kid:ammo-changed', {
      kidId: kid.id,
      ammo: kid.ammo,
      maxAmmo: kid.maxAmmo,
    });
  }

  // ──────────────────────────────────────────
  // Win/lose checks
  // ──────────────────────────────────────────

  private checkRoundEnd(): void {
    const allPlayersDead = this.playerKids.every((k) => k.state === 'out');
    const allEnemiesDead = this.enemyKids.every((k) => k.state === 'out');

    if (allPlayersDead) {
      this.roundOver = true;
      EventBus.emit('round:end', { winnerTeam: 'team2' });
      EventBus.emit('game:over', { won: false, level: 0 });
    } else if (allEnemiesDead) {
      this.roundOver = true;
      EventBus.emit('round:end', { winnerTeam: 'team1' });
      EventBus.emit('game:over', { won: true, level: 0 });
    }
  }
}
