import Phaser from 'phaser';

/**
 * BootScene — The first scene that runs. Handles initial setup
 * and transitions to the demo scene.
 *
 * In later phases, this will load assets and show a loading bar,
 * then transition to PreloadScene → GameScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    // The string key is how Phaser identifies this scene.
    // We pass it to the parent Scene class via super().
    super({ key: 'BootScene' });
  }

  /**
   * `preload` runs before `create`. Use it to load assets.
   * For now, we have no assets to load — just placeholder shapes.
   */
  preload(): void {
    // Future: load sprite atlases, audio, tilemaps here
  }

  /**
   * `create` runs once after preload completes.
   * We immediately start the DemoScene.
   */
  create(): void {
    this.scene.start('DemoScene');
  }
}
