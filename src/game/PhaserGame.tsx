import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from './config';

/**
 * PhaserGame — React component that mounts and manages a Phaser game instance.
 *
 * WHY THIS IS TRICKY:
 * React StrictMode (enabled in development) intentionally double-invokes
 * useEffect to catch bugs. This means:
 *   1. Mount → create Phaser instance
 *   2. Unmount → destroy Phaser instance (cleanup runs)
 *   3. Mount again → create a second Phaser instance
 *
 * Without careful handling, you'd get TWO canvases or a broken game.
 *
 * SOLUTION:
 * - Use a ref (`gameRef`) to hold the Phaser.Game instance.
 * - In the cleanup function, call `game.destroy(true)` to fully tear down.
 * - The second mount then creates a fresh, clean instance.
 * - Use a `containerRef` to always have the correct DOM element.
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Guard: don't create if container doesn't exist
    if (!containerRef.current) return;

    // Guard: don't create if a game already exists (shouldn't happen, but defensive)
    if (gameRef.current) return;

    // Create the Phaser game, parented to our div
    const game = new Phaser.Game(createGameConfig(containerRef.current));
    gameRef.current = game;

    // Cleanup: runs when the component unmounts (or StrictMode re-mounts)
    return () => {
      if (gameRef.current) {
        // `destroy(true)` removes the canvas from the DOM and cleans up all scenes
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} id="phaser-container" className="w-full h-full" />;
}
