/**
 * GameHud — React overlay showing player kid's HP, ammo, and game status.
 *
 * This component listens to EventBus events emitted by Phaser's GameScene
 * and displays them as styled HTML elements positioned over the canvas.
 *
 * WHY REACT FOR HUD (and not Phaser)?
 * - React is better at text, layout, and responsive design.
 * - Easier to style with Tailwind.
 * - Easier for you (the designer) to tweak in Figma and match in code.
 * - Phaser should only render the game world (sprites, tiles, projectiles).
 */

import { useEffect, useState } from 'react';
import { EventBus } from '../../events/EventBus';

export function GameHud() {
  const [hp, setHp] = useState({ current: 0, max: 1 });
  const [ammo, setAmmo] = useState({ current: 0, max: 1 });
  const [gameOver, setGameOver] = useState<{ won: boolean } | null>(null);
  const [hitFeedback, setHitFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      EventBus.on('kid:hp-changed', (payload) => {
        setHp({ current: payload.hp, max: payload.maxHp });
      }),
    );

    unsubs.push(
      EventBus.on('kid:ammo-changed', (payload) => {
        setAmmo({ current: payload.ammo, max: payload.maxAmmo });
      }),
    );

    unsubs.push(
      EventBus.on('game:over', (payload) => {
        setGameOver({ won: payload.won });
      }),
    );

    unsubs.push(
      EventBus.on('projectile:hit', (payload) => {
        const text = payload.isCritical ? 'CRITICAL HIT!' : 'Hit!';
        setHitFeedback(text);
        // Clear after a short delay
        setTimeout(() => setHitFeedback(null), 800);
      }),
    );

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, []);

  const hpPercent = hp.max > 0 ? (hp.current / hp.max) * 100 : 0;
  const hpColor = hpPercent > 60 ? 'bg-green-500' : hpPercent > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ─── Top-left: HP and Ammo ─── */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        {/* HP Bar */}
        <div className="pointer-events-auto rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm">
          <div className="mb-1 text-xs font-bold text-white">
            HP: {hp.current}/{hp.max}
          </div>
          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-200 ${hpColor}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Ammo */}
        <div className="pointer-events-auto rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm">
          <div className="text-xs font-bold text-white">
            ❄ Ammo: {ammo.current}/{ammo.max}
          </div>
          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: ammo.max }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i < ammo.current ? 'bg-cyan-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Center: Hit feedback ─── */}
      {hitFeedback && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className={`rounded-lg px-4 py-2 text-lg font-black ${
              hitFeedback.includes('CRITICAL')
                ? 'bg-red-600/80 text-yellow-300'
                : 'bg-black/60 text-white'
            }`}
          >
            {hitFeedback}
          </div>
        </div>
      )}

      {/* ─── Center: Game Over overlay ─── */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl bg-gray-900/90 px-8 py-6 text-center backdrop-blur-sm">
            <h2
              className={`mb-2 text-3xl font-black ${
                gameOver.won ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {gameOver.won ? '🎉 YOU WIN!' : '💀 DEFEATED'}
            </h2>
            <p className="mb-4 text-sm text-gray-300">
              {gameOver.won ? 'All enemies are down!' : 'Your team has been eliminated.'}
            </p>
            <button
              className="pointer-events-auto rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              onClick={() => {
                setGameOver(null);
                EventBus.emit('game:start', { level: 0 });
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* ─── Bottom: Controls hint ─── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className="rounded-lg bg-black/40 px-4 py-1.5 text-center text-xs text-white/70">
          Tap ground to move · Tap enemy to throw · Walk to ❄ pile for ammo
        </div>
      </div>
    </div>
  );
}
