// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Phaser's canvas initialization requires getContext('2d')
beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = (() => ({
      globalCompositeOperation: 'source-over',
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      fillRect: () => {},
      clearRect: () => {},
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  }
});

describe('Scene Lifecycle Cleanup', () => {
  let EventBus: typeof import('../src/events/EventBus').EventBus;
  let DemoScene: typeof import('../src/game/scenes/DemoScene').DemoScene;
  let Phaser: typeof import('phaser');

  beforeAll(async () => {
    // Dynamic import after Canvas mock is installed
    const phaserMod = await import('phaser');
    Phaser = phaserMod.default || phaserMod;
    const ebMod = await import('../src/events/EventBus');
    EventBus = ebMod.EventBus;
    const dsMod = await import('../src/game/scenes/DemoScene');
    DemoScene = dsMod.DemoScene;
  });

  beforeEach(() => {
    EventBus.clear();
  });

  /** Helper to inject minimal scene dependencies required for create() */
  function mockSceneSystems(
    scene: InstanceType<typeof DemoScene>,
    emitter: InstanceType<typeof Phaser.Events.EventEmitter>,
  ): void {
    const record = scene as unknown as Record<string, unknown>;
    record.events = emitter;
    record.add = {
      text: () => ({ setOrigin: () => {} }),
      circle: () => ({
        setStrokeStyle: () => {},
        setInteractive: () => {},
        on: () => {},
        setScale: () => {},
      }),
    };
    record.input = {
      on: () => {},
    };
    record.tweens = {
      add: () => {},
    };
  }

  it('unsubscribes from EventBus when scene emits DESTROY event (React unmount path)', () => {
    const scene = new DemoScene();
    const emitter = new Phaser.Events.EventEmitter();
    mockSceneSystems(scene, emitter);

    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(0);

    scene.create();

    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(1);

    // Simulate game.destroy(true) which emits DESTROY on scene systems
    emitter.emit(Phaser.Scenes.Events.DESTROY);

    // After DESTROY, listener count must be 0
    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(0);
  });

  it('unsubscribes from EventBus when scene emits SHUTDOWN event (Scene stop/restart path)', () => {
    const scene = new DemoScene();
    const emitter = new Phaser.Events.EventEmitter();
    mockSceneSystems(scene, emitter);

    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(0);

    scene.create();

    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(1);

    // Simulate scene stop/restart which emits SHUTDOWN
    emitter.emit(Phaser.Scenes.Events.SHUTDOWN);

    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(0);
  });

  it('calling cleanup twice (e.g. SHUTDOWN followed by DESTROY) is harmless', () => {
    const scene = new DemoScene();
    const emitter = new Phaser.Events.EventEmitter();
    mockSceneSystems(scene, emitter);

    scene.create();
    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(1);

    expect(() => {
      emitter.emit(Phaser.Scenes.Events.SHUTDOWN);
      emitter.emit(Phaser.Scenes.Events.DESTROY);
    }).not.toThrow();

    expect(EventBus.listenerCount('demo:spawn-shape')).toBe(0);
  });
});
