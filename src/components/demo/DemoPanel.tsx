import { useEffect, useState } from 'react';
import { EventBus } from '../../events/EventBus';

/**
 * DemoPanel — A React UI panel that demonstrates bidirectional
 * communication with Phaser via the EventBus.
 *
 * This component:
 *  1. Has a button that tells Phaser to spawn a shape (React → Phaser)
 *  2. Displays info when Phaser reports a shape was clicked (Phaser → React)
 *  3. Shows a click counter updated by Phaser
 *
 * This is the Phase 1 proof-of-concept. It will be replaced by the
 * actual HUD and menu components in Phase 5.
 */
export function DemoPanel() {
  const [sceneReady, setSceneReady] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [lastClick, setLastClick] = useState<{
    x: number;
    y: number;
    color: string;
  } | null>(null);

  useEffect(() => {
    // Listen for Phaser → React events
    const unsubReady = EventBus.on('scene:ready', () => {
      setSceneReady(true);
    });

    const unsubCounter = EventBus.on('scene:counter-update', ({ count }) => {
      setClickCount(count);
    });

    const unsubClick = EventBus.on('demo:shape-clicked', (data) => {
      setLastClick(data);
    });

    // Cleanup all listeners when this component unmounts
    return () => {
      unsubReady();
      unsubCounter();
      unsubClick();
    };
  }, []);

  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
      {/* Spawn button */}
      <button
        onClick={() => EventBus.emit('demo:spawn-shape')}
        disabled={!sceneReady}
        className="pointer-events-auto rounded-xl bg-game-highlight px-5 py-3 text-sm font-bold text-white
                   shadow-lg transition-all active:scale-95 disabled:opacity-40
                   hover:brightness-110 min-w-[140px]"
      >
        {sceneReady ? '🎯 Spawn Shape' : '⏳ Loading...'}
      </button>

      {/* Status display */}
      <div className="pointer-events-auto flex flex-wrap gap-3">
        {/* Click counter */}
        <div className="rounded-xl bg-game-surface/90 px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm">
          <span className="text-game-text-dim">Shapes clicked: </span>
          <span className="font-bold text-game-highlight">{clickCount}</span>
        </div>

        {/* Last click info */}
        {lastClick && (
          <div className="rounded-xl bg-game-surface/90 px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm">
            <span className="text-game-text-dim">Last click: </span>
            <span className="font-bold" style={{ color: lastClick.color }}>
              ({lastClick.x}, {lastClick.y})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
