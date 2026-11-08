/**
 * SnowballSprite — Phaser visual for a Projectile in flight.
 *
 * Renders as a small white circle with a ground shadow. The visual Y
 * position is offset by the projectile's parabolic arc, making it
 * appear to lob through the air while the shadow stays on the ground.
 *
 * PLACEHOLDER ART: A white filled circle. Will be replaced with a
 * snowball sprite in a later art phase.
 */

import Phaser from 'phaser';
import type { Projectile } from '../../simulation/Projectile';

const SNOWBALL_RADIUS = 5;
const SHADOW_RADIUS = 4;

export class SnowballSprite extends Phaser.GameObjects.Container {
  readonly projectile: Projectile;

  private ball: Phaser.GameObjects.Arc;
  private shadow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, projectile: Projectile) {
    super(scene, projectile.currentPosition.x, projectile.currentPosition.y);
    this.projectile = projectile;

    // Ground shadow (rendered first, beneath the ball)
    this.shadow = scene.add.circle(0, 0, SHADOW_RADIUS, 0x000000, 0.25);
    this.add(this.shadow);

    // The snowball itself (offset upward by arc)
    this.ball = scene.add.circle(0, 0, SNOWBALL_RADIUS, 0xffffff);
    this.ball.setStrokeStyle(1, 0xcccccc);
    this.add(this.ball);

    scene.add.existing(this);
  }

  /**
   * Sync the sprite to the simulation Projectile's state.
   * Called every frame from GameScene.update().
   */
  syncToSimulation(): void {
    const proj = this.projectile;

    if (proj.spent) {
      this.setVisible(false);
      return;
    }

    // Ground position (shadow stays here)
    this.x = proj.currentPosition.x;
    this.y = proj.currentPosition.y;

    // Shadow stays at y=0 (ground level, relative to container)
    this.shadow.y = 0;

    // Ball offset upward by the arc (negative = up on screen)
    this.ball.y = -proj.currentArcOffset;

    // Depth: use the visual Y of the ball so it renders above/below
    // kids correctly during flight
    this.setDepth(proj.visualY);
  }
}
