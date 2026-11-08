/**
 * SnowPileSprite — Phaser visual for a SnowPile ammo source.
 *
 * Renders as a white mound shape with a text label showing remaining
 * snowballs. Fades out when depleted.
 *
 * PLACEHOLDER ART: A white ellipse. Will be replaced with a drawn
 * snow pile sprite in a later art phase.
 */

import Phaser from 'phaser';
import type { SnowPile } from '../../simulation/SnowPile';

const PILE_WIDTH = 24;
const PILE_HEIGHT = 14;

export class SnowPileSprite extends Phaser.GameObjects.Container {
  readonly pile: SnowPile;

  private mound: Phaser.GameObjects.Ellipse;
  private countLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, pile: SnowPile) {
    super(scene, pile.position.x, pile.position.y);
    this.pile = pile;

    // White mound shape
    this.mound = scene.add.ellipse(0, 0, PILE_WIDTH, PILE_HEIGHT, 0xf0f0f0);
    this.mound.setStrokeStyle(1, 0xcccccc);
    this.add(this.mound);

    // Remaining count label
    this.countLabel = scene.add.text(0, -14, String(pile.remaining), {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#666666',
      align: 'center',
    });
    this.countLabel.setOrigin(0.5, 0.5);
    this.add(this.countLabel);

    // Set depth slightly below kids (snow piles are on the ground)
    this.setDepth(pile.position.y - 1);

    // Make interactive for tap-to-pickup
    this.setSize(PILE_WIDTH + 8, PILE_HEIGHT + 8);
    this.setInteractive();

    scene.add.existing(this);
  }

  /**
   * Sync the sprite to the simulation SnowPile's state.
   * Called every frame from GameScene.update().
   */
  syncToSimulation(): void {
    const pile = this.pile;

    this.countLabel.setText(String(pile.remaining));

    if (pile.isDepleted) {
      this.setAlpha(0.3);
      this.disableInteractive();
    } else {
      this.setAlpha(1);
    }
  }
}
