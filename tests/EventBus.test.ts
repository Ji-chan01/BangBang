import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../src/events/EventBus';

/**
 * Tests for the typed EventBus.
 *
 * These verify the pub/sub communication backbone that connects
 * React and Phaser. If this breaks, nothing in the game works.
 */
describe('EventBus', () => {
  beforeEach(() => {
    // Start each test with a clean slate
    EventBus.clear();
  });

  it('should call handler when event is emitted', () => {
    const handler = vi.fn();
    EventBus.on('scene:ready', handler);

    EventBus.emit('scene:ready');

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should pass payload to handler', () => {
    const handler = vi.fn();
    EventBus.on('demo:shape-clicked', handler);

    EventBus.emit('demo:shape-clicked', { x: 10, y: 20, color: '#ff0000' });

    expect(handler).toHaveBeenCalledWith({ x: 10, y: 20, color: '#ff0000' });
  });

  it('should support multiple handlers for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    EventBus.on('scene:ready', handler1);
    EventBus.on('scene:ready', handler2);

    EventBus.emit('scene:ready');

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should unsubscribe when calling the returned function', () => {
    const handler = vi.fn();
    const unsub = EventBus.on('scene:ready', handler);

    unsub();
    EventBus.emit('scene:ready');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not fire handlers for different events', () => {
    const handler = vi.fn();
    EventBus.on('scene:ready', handler);

    EventBus.emit('game:pause');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle emit with no registered handlers gracefully', () => {
    // Should not throw
    expect(() => EventBus.emit('scene:ready')).not.toThrow();
  });

  it('should remove all handlers for an event with off()', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    EventBus.on('scene:ready', handler1);
    EventBus.on('scene:ready', handler2);

    EventBus.off('scene:ready');
    EventBus.emit('scene:ready');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should clear all handlers across all events', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    EventBus.on('scene:ready', handler1);
    EventBus.on('game:pause', handler2);

    EventBus.clear();
    EventBus.emit('scene:ready');
    EventBus.emit('game:pause');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should pass structured game data correctly', () => {
    const handler = vi.fn();
    EventBus.on('game:start', handler);

    EventBus.emit('game:start', { level: 42 });

    expect(handler).toHaveBeenCalledWith({ level: 42 });
  });

  it('should handle counter updates (Phaser → React flow)', () => {
    const handler = vi.fn();
    EventBus.on('scene:counter-update', handler);

    EventBus.emit('scene:counter-update', { count: 5 });
    EventBus.emit('scene:counter-update', { count: 6 });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenLastCalledWith({ count: 6 });
  });
});

