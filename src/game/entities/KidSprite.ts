/**
 * KidSprite — Phaser visual representation of a simulation Kid.
 *
 * WHY A CONTAINER?
 * A kid's visual has multiple parts: the body circle, an HP bar, an ammo
 * indicator, and a team-color ring. Phaser.GameObjects.Container groups
 * them so they all move/sort together. We read the simulation Kid's state
 * each frame and update the visuals accordingly — the sprite never drives
 * the simulation, only reflects it.
 *
 * PLACEHOLDER ART: Phase 2 uses simple shapes (colored circles).
 * In a later phase, these get swapped for sprite sheet frames.
 */

import Phaser from 'phaser';
import type { Kid } from '../../simulation/Kid';

/** Team color palette */
const TEAM_COLORS: Record<string, number> = {
  team1: 0x3b82f6, // Blue
  team2: 0xef4444, // Red
};

/** The radius of the kid circle (pixels). */
const BODY_RADIUS = 14;

/** HP bar dimensions */
const HP_BAR_WIDTH = 28;
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET_Y = -22;

export class KidSprite extends Phaser.GameObjects.Container {
  /** Reference to the simulation Kid this sprite represents. */
  readonly kid: Kid;

  private body: Phaser.GameObjects.Arc;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBarFill: Phaser.GameObjects.Rectangle;
  private roleLabel: Phaser.GameObjects.Text;

  /** Is this the kid the player is currently controlling? */
  private _isSelected = false;
  private selectionRing: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, kid: Kid) {
    super(scene, kid.position.x, kid.position.y);
    this.kid = kid;

    // Team-colored body circle
    const teamColor = TEAM_COLORS[kid.teamId] ?? 0xaaaaaa;
    this.body = scene.add.circle(0, 0, BODY_RADIUS, teamColor);
    this.add(this.body);

    // Selection ring (slightly larger, shown when player controls this kid)
    this.selectionRing = scene.add.circle(0, 0, BODY_RADIUS + 4);
    this.selectionRing.setStrokeStyle(2, 0xffd700); // Gold ring
    this.selectionRing.setFillStyle(0, 0); // Transparent fill
    this.selectionRing.setVisible(false);
    this.add(this.selectionRing);

    // HP bar background (dark)
    this.hpBarBg = scene.add.rectangle(0, HP_BAR_OFFSET_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x333333);
    this.add(this.hpBarBg);

    // HP bar fill (green → yellow → red based on HP %)
    this.hpBarFill = scene.add.rectangle(0, HP_BAR_OFFSET_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x22c55e);
    this.add(this.hpBarFill);

    // Role label (single character: T/R/B)
    const roleChar = kid.role === 'thrower' ? 'T' : kid.role === 'runner' ? 'R' : 'B';
    this.roleLabel = scene.add.text(0, 0, roleChar, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
    });
    this.roleLabel.setOrigin(0.5, 0.5);
    this.add(this.roleLabel);

    // Set interactive for click/tap detection
    this.setSize(BODY_RADIUS * 2 + 8, BODY_RADIUS * 2 + 8);
    this.setInteractive();

    scene.add.existing(this);
  }

  get isSelected(): boolean {
    return this._isSelected;
  }

  set isSelected(value: boolean) {
    this._isSelected = value;
    this.selectionRing.setVisible(value);
  }

  /**
   * Sync the sprite's visuals to the simulation Kid's state.
   * Called every frame from GameScene.update().
   */
  syncToSimulation(): void {
    const kid = this.kid;

    // Position
    this.x = kid.position.x;
    this.y = kid.position.y;

    // Depth sorting by Y position (higher Y = further down screen = rendered on top)
    this.setDepth(kid.position.y);

    // HP bar
    const hpRatio = kid.hp / kid.maxHp;
    this.hpBarFill.width = HP_BAR_WIDTH * hpRatio;
    // Shift fill bar left so it drains from the right
    this.hpBarFill.x = -(HP_BAR_WIDTH * (1 - hpRatio)) / 2;
    // Color: green > 60%, yellow > 30%, red <= 30%
    if (hpRatio > 0.6) {
      this.hpBarFill.setFillStyle(0x22c55e); // Green
    } else if (hpRatio > 0.3) {
      this.hpBarFill.setFillStyle(0xeab308); // Yellow
    } else {
      this.hpBarFill.setFillStyle(0xef4444); // Red
    }

    // State-based visual changes
    switch (kid.state) {
      case 'downed':
        this.body.setAlpha(0.5);
        this.roleLabel.setText('X');
        break;
      case 'out':
        this.setVisible(false);
        break;
      case 'throwing':
        // Brief squash effect (scale up slightly)
        this.body.setScale(1.15);
        break;
      default:
        this.body.setAlpha(1);
        this.body.setScale(1);
        this.roleLabel.setText(kid.role === 'thrower' ? 'T' : kid.role === 'runner' ? 'R' : 'B');
        break;
    }
  }
}
