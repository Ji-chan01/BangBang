import { PhaserGame } from './game/PhaserGame';
import { RotateOverlay } from './components/overlays/RotateOverlay';
import { GameHud } from './components/hud/GameHud';

/**
 * App — Root React component.
 *
 * LAYOUT STRATEGY:
 * - The Phaser canvas fills the entire screen (via PhaserGame).
 * - React UI (HUD, menus, overlays) is absolutely positioned ON TOP of the canvas.
 * - The RotateOverlay covers everything when the phone is in portrait.
 *
 * This layering approach means:
 * - Phaser handles ALL game rendering (sprites, tilemap, projectiles).
 * - React handles ALL UI (menus, HUD text, buttons).
 * - They never fight over DOM layout.
 */
export default function App() {
  return (
    <div className="relative w-full h-full">
      {/* Game canvas — fills the entire container */}
      <PhaserGame />

      {/* React HUD layer on top of the canvas */}
      <GameHud />

      {/* Portrait rotation overlay — highest z-index, blocks everything */}
      <RotateOverlay />
    </div>
  );
}
