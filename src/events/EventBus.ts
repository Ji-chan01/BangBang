/**
 * EventBus — Typed publish/subscribe system for React ↔ Phaser communication.
 *
 * WHY: React and Phaser live in separate worlds. React renders UI (menus, HUD),
 * Phaser renders the game canvas. They must never directly reference each other's
 * internals. The EventBus is the single communication channel between them.
 *
 * HOW: We define an EventMap that maps event names to their payload types.
 * The `emit` and `on` methods are fully type-safe — you can't emit an event
 * with the wrong payload, and listeners always know exactly what data they'll get.
 *
 * PATTERN: This is the "Observer" pattern (also called pub/sub). It decouples
 * the sender from the receiver. The sender doesn't know who's listening,
 * and the receiver doesn't know who sent the event.
 */

/**
 * Define all events that can flow between React and Phaser here.
 * Add new events as the game grows — this is the single source of truth.
 */
export interface EventMap {
  // ─── React → Phaser ───
  /** React tells Phaser to start a game at a specific level */
  'game:start': { level: number };
  /** React tells Phaser to pause/resume */
  'game:pause': undefined;
  'game:resume': undefined;

  // ─── Phaser → React ───
  /** Phaser tells React the game scene is ready */
  'scene:ready': undefined;
  /** Phaser sends a counter value to React (demo) */
  'scene:counter-update': { count: number };
  /** Phaser tells React the game is over */
  'game:over': { won: boolean; level: number };

  // ─── Demo events (Phase 1 proof-of-concept) ───
  /** React button click triggers Phaser to spawn a shape */
  'demo:spawn-shape': undefined;
  /** Phaser tells React a shape was clicked */
  'demo:shape-clicked': { x: number; y: number; color: string };
}

type EventName = keyof EventMap;
type Handler<T> = (payload: T) => void;

class TypedEventBus {
  // We store handlers in a Map of event name → Set of handler functions.
  // Using a Set prevents duplicate registrations of the same handler.
  private handlers = new Map<string, Set<Handler<unknown>>>();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   *
   * Usage:
   *   const unsub = EventBus.on('scene:ready', () => { ... });
   *   // later: unsub();
   */
  on<E extends EventName>(event: E, handler: Handler<EventMap[E]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as Handler<unknown>);

    // Return an unsubscribe function — important for React useEffect cleanup
    return () => {
      set.delete(handler as Handler<unknown>);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  /**
   * Emit an event with its payload. All registered handlers fire synchronously.
   *
   * For events with no payload (undefined), call as: EventBus.emit('game:pause')
   * For events with payload: EventBus.emit('demo:shape-clicked', { x: 10, y: 20, color: '#f00' })
   */
  emit<E extends EventName>(
    event: E,
    ...args: EventMap[E] extends undefined ? [] : [payload: EventMap[E]]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    const payload = args[0] as EventMap[E];
    for (const handler of set) {
      (handler as Handler<EventMap[E]>)(payload);
    }
  }

  /** Remove all handlers for a specific event */
  off(event: EventName): void {
    this.handlers.delete(event);
  }

  /** Remove ALL handlers for ALL events. Used during cleanup. */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Singleton instance — both React and Phaser import this same object.
 * This is safe because there's only one browser tab running the game.
 */
export const EventBus = new TypedEventBus();

