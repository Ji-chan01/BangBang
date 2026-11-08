import { useEffect, useState } from 'react';

/**
 * RotateOverlay — Shows a "Please rotate your device" message when
 * the phone is in portrait orientation.
 *
 * WHY: The game arena is landscape (wider than tall). Playing in portrait
 * would make everything too small to see and tap. Instead of trying to
 * support both orientations (which doubles our layout work), we ask the
 * player to rotate — this is standard for mobile games.
 *
 * HOW: We listen to the `resize` event and check if width < height.
 * We DON'T use the Screen Orientation API because it's not reliable
 * across all mobile browsers and requires fullscreen on some platforms.
 */
export function RotateOverlay() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    function checkOrientation() {
      // Only show on mobile-sized screens (< 1024px wide OR < 1024px tall)
      const isMobile = Math.min(window.innerWidth, window.innerHeight) < 600;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && isPortraitMode);
    }

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-game-bg/95 backdrop-blur-sm">
      {/* Rotating phone icon */}
      <div className="text-6xl animate-pulse">📱🔄</div>
      <p className="text-xl font-bold text-game-text text-center px-8">
        Please rotate your device to landscape
      </p>
      <p className="text-sm text-game-text-dim text-center px-8">
        BangBang is best played in landscape mode
      </p>
    </div>
  );
}
