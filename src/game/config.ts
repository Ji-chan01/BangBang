import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { DemoScene } from './scenes/DemoScene';

/**
 * Creates the Phaser game configuration.
 *
 * WHY a function instead of a const? Because we need to pass the parent DOM
 * element dynamically (the React ref). Each time the React component mounts,
 * it creates a fresh config pointing at the correct container div.
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    // Logical resolution — the game world size.
    // The Scale Manager will fit this into whatever screen size is available.
    width: 960,
    height: 640,
    backgroundColor: '#2d5a3f', // Snowy field green (placeholder)
    physics: {
      default: 'arcade',
      arcade: {
        // No gravity — this is a top-down game
        gravity: { x: 0, y: 0 },
        debug: import.meta.env.DEV,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT, // Scale to fit the container, maintaining aspect ratio
      autoCenter: Phaser.Scale.CENTER_BOTH,
      expandParent: false, // Don't resize the parent div
    },
    scene: [BootScene, DemoScene],
    // Prevent right-click context menu on the game canvas
    disableContextMenu: true,
    // Enable touch input
    input: {
      touch: true,
      mouse: true,
    },
    // Render settings for crisp pixel art (when we add real sprites)
    render: {
      pixelArt: false, // Set to true if using pixel art style
      antialias: true,
    },
  };
}
