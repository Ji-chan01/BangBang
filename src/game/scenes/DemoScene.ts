import Phaser from 'phaser';
import { EventBus } from '../../events/EventBus';

/**
 * DemoScene — A temporary scene for Phase 1 that demonstrates:
 *  1. Phaser rendering basic shapes
 *  2. React → Phaser communication (spawn shapes via EventBus)
 *  3. Phaser → React communication (report clicks via EventBus)
 *  4. Touch/click input handling
 *
 * This scene will be replaced by GameScene in Phase 2.
 */
export class DemoScene extends Phaser.Scene {
  /** Track spawned shapes so we can interact with them */
  private shapes: Phaser.GameObjects.Arc[] = [];
  private clickCount = 0;

  constructor() {
    super({ key: 'DemoScene' });
  }

  create(): void {
    // ─── Draw a title ───
    this.add.text(960 / 2, 40, '🎯 BangBang — Phase 1 Demo', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5);

    this.add.text(960 / 2, 75, 'Click/tap the canvas or press the React button to spawn shapes', {
      fontSize: '14px',
      color: '#aaccaa',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5);

    // ─── Listen for React → Phaser event ───
    // When the React button emits 'demo:spawn-shape', we spawn a circle at a random position.
    EventBus.on('demo:spawn-shape', () => {
      const x = Phaser.Math.Between(80, 880);
      const y = Phaser.Math.Between(120, 560);
      this.spawnShape(x, y);
    });

    // ─── Handle tap/click directly on the Phaser canvas ───
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.spawnShape(pointer.x, pointer.y);
    });

    // ─── Tell React the scene is ready ───
    EventBus.emit('scene:ready');
  }

  /**
   * Spawn a colored circle at (x, y) that can be clicked.
   * Demonstrates Phaser → React communication on click.
   */
  private spawnShape(x: number, y: number): void {
    // Pick a random bright color
    const colors = [0x3b82f6, 0xef4444, 0x22c55e, 0xeab308, 0xa855f7, 0xf97316];
    const color = colors[Phaser.Math.Between(0, colors.length - 1)]!;

    const circle = this.add.circle(x, y, 20, color);
    circle.setStrokeStyle(2, 0xffffff);

    // Make it interactive (clickable/tappable)
    circle.setInteractive(
      new Phaser.Geom.Circle(0, 0, 20),
      Phaser.Geom.Circle.Contains
    );

    // When this specific circle is clicked, emit to React
    circle.on('pointerdown', () => {
      this.clickCount++;

      // Convert Phaser color int to CSS hex string
      const hexColor = `#${color.toString(16).padStart(6, '0')}`;

      // Phaser → React: tell React which shape was clicked
      EventBus.emit('demo:shape-clicked', {
        x: Math.round(circle.x),
        y: Math.round(circle.y),
        color: hexColor,
      });

      // Update the counter display
      EventBus.emit('scene:counter-update', { count: this.clickCount });

      // Visual feedback: brief scale bounce (squash & stretch feel)
      this.tweens.add({
        targets: circle,
        scaleX: 1.4,
        scaleY: 0.7,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    });

    // Spawn animation: grow from zero
    circle.setScale(0);
    this.tweens.add({
      targets: circle,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    this.shapes.push(circle);

    // Keep only the last 30 shapes to prevent performance issues
    if (this.shapes.length > 30) {
      const old = this.shapes.shift();
      if (old) {
        this.tweens.add({
          targets: old,
          scale: 0,
          alpha: 0,
          duration: 150,
          onComplete: () => old.destroy(),
        });
      }
    }
  }

  /**
   * Clean up EventBus listeners when the scene shuts down.
   * Prevents memory leaks and stale handlers.
   */
  shutdown(): void {
    EventBus.off('demo:spawn-shape');
  }

  destroy(): void {
    this.shutdown();
  }
}

