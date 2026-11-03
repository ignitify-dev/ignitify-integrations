import { describe, expect, it } from 'vitest';
import { processStop } from '@ignitify-integrations/runtime';

describe('processStop', () => {
  it('aborts on SIGTERM and gives the signal back on release', () => {
    const before = process.listenerCount('SIGTERM');
    const stop = processStop();
    expect(process.listenerCount('SIGTERM')).toBe(before + 1);
    process.emit('SIGTERM');
    expect(stop.signal.aborted).toBe(true);
    stop.release();
    expect(process.listenerCount('SIGTERM')).toBe(before);
  });

  it('release before any signal leaves no listener and no abort', () => {
    const term = process.listenerCount('SIGTERM');
    const int = process.listenerCount('SIGINT');
    const stop = processStop();
    stop.release();
    expect(stop.signal.aborted).toBe(false);
    expect(process.listenerCount('SIGTERM')).toBe(term);
    expect(process.listenerCount('SIGINT')).toBe(int);
  });
});
