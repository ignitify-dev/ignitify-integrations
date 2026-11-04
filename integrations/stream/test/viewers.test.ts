import { describe, expect, it } from 'vitest';
import { VIEWER_LOG_MAX, VIEWER_WINDOW_MS } from '../src/constants.js';
import { NO_VIEWERS, countViewers, recordViewer, viewerId, type ViewerLog } from '../src/viewers.js';

describe('viewerId', () => {
  it('reads the player id from the playlist URL', () => {
    expect(viewerId('/live/index.m3u8?v=abc123def')).toBe('abc123def');
    expect(viewerId('/live/index.m3u8?x=1&v=abc123#t')).toBe('abc123');
  });
  it('is null with no id, or an id that is not the player shape', () => {
    expect(viewerId('/live/index.m3u8')).toBeNull();
    expect(viewerId('/live/index.m3u8#v=abc123')).toBeNull();
    expect(viewerId('/live/index.m3u8?v=')).toBeNull();
    expect(viewerId('/live/index.m3u8?v=ABC123')).toBeNull();
    expect(viewerId(`/live/index.m3u8?v=${'a'.repeat(17)}`)).toBeNull();
  });
});

describe('recordViewer and countViewers', () => {
  it('counts ids seen within the window; a repeat request refreshes, not adds', () => {
    let log = recordViewer(NO_VIEWERS, 'tab1aa', 1_000);
    log = recordViewer(log, 'tab2bb', 2_000);
    log = recordViewer(log, 'tab1aa', 3_000);
    expect(countViewers(log, 3_000)).toBe(2);
    expect(countViewers(log, 2_001 + VIEWER_WINDOW_MS)).toBe(1);
    expect(countViewers(log, 3_001 + VIEWER_WINDOW_MS)).toBe(0);
  });

  it('never changes the log it is given, and drops ids older than the window', () => {
    const log = recordViewer(NO_VIEWERS, 'tab1aa', 1_000);
    const next = recordViewer(log, 'tab2bb', 1_001 + VIEWER_WINDOW_MS);
    expect([...log.keys()]).toEqual(['tab1aa']);
    expect([...next.keys()]).toEqual(['tab2bb']);
  });

  it('stops adding new ids at the cap, keeps refreshing known ones, and frees room as ids expire', () => {
    const full: ViewerLog = new Map(Array.from({ length: VIEWER_LOG_MAX }, (_, i) => [`id${i}aaa`, 1_000]));
    expect(countViewers(recordViewer(full, 'newone', 1_000), 1_000)).toBe(VIEWER_LOG_MAX);
    expect(recordViewer(full, 'newone', 1_000).has('newone')).toBe(false);
    expect(recordViewer(full, 'id0aaa', 2_000).get('id0aaa')).toBe(2_000);
    expect(recordViewer(full, 'newone', 1_001 + VIEWER_WINDOW_MS).has('newone')).toBe(true);
  });
});
