import { describe, expect, it } from 'vitest';
import { MEDIA_TYPES, PLAYER_SCRIPT_FILE, PLAYLIST_FILE } from '../src/constants.js';
import { playerPage, resolveRoute, viewerUrl, watchUrl } from '../src/routes.js';

const ROUTE = '/live/';

describe('resolveRoute', () => {
  it('serves the player at the route, with or without the last slash', () => {
    expect(resolveRoute('/live/', ROUTE)).toEqual({ kind: 'player' });
    expect(resolveRoute('/live', ROUTE)).toEqual({ kind: 'player' });
  });

  it('serves hls.js under the route', () => {
    expect(resolveRoute(`/live/${PLAYER_SCRIPT_FILE}`, ROUTE)).toEqual({ kind: 'script' });
  });

  it('serves the playlist and segments by name with their media type', () => {
    expect(resolveRoute('/live/index.m3u8', ROUTE)).toEqual({
      kind: 'media',
      name: 'index.m3u8',
      type: MEDIA_TYPES['.m3u8'],
    });
    expect(resolveRoute('/live/index12.ts', ROUTE)).toEqual({
      kind: 'media',
      name: 'index12.ts',
      type: MEDIA_TYPES['.ts'],
    });
  });

  it.each([
    '/live/../secret.ts',
    '/live/..%2f..%2fetc%2fpasswd.ts',
    '/live/%2e%2e/x.ts',
    '/live/sub/index.ts',
    '/live//index.ts',
    '/live/.ts',
    '/live/..ts',
    '/live/a\\b.ts',
    '/live/index.mp4',
    '/live/index.m3u8.bak',
    '/live/hls.min.js.map',
    '/live/package.json',
    '/live/index.ts/',
    '/index.m3u8',
    '/livex/index.m3u8',
    '/',
    '',
  ])('refuses %j', (path) => {
    expect(resolveRoute(path, ROUTE)).toEqual({ kind: 'none' });
  });

  it('follows a custom route', () => {
    expect(resolveRoute('/tv/index.m3u8', '/tv/')).toMatchObject({ kind: 'media' });
    expect(resolveRoute('/live/index.m3u8', '/tv/')).toEqual({ kind: 'none' });
  });
});

describe('viewerUrl', () => {
  it('is the callback origin plus the route; the callback path and query are dropped', () => {
    expect(viewerUrl('https://r1--t1.example.dev/__callback/run_1?sig=x', ROUTE)).toBe(
      'https://r1--t1.example.dev/live/',
    );
  });
  it('is null when the run has no callback', () => {
    expect(viewerUrl(null, ROUTE)).toBeNull();
  });
  it('watchUrl gives task code the same link from ctx, with the default route', () => {
    const ctx = { callback: { url: 'https://r1--t1.example.dev/__callback/run_1?sig=x', verify: () => true } };
    expect(watchUrl(ctx as never)).toBe('https://r1--t1.example.dev/live/');
    expect(watchUrl({ callback: null })).toBeNull();
  });
});

describe('playerPage', () => {
  it('loads hls.js and the playlist by absolute path under the route, from no other origin', () => {
    const page = playerPage('/tv/');
    expect(page).toContain(`src="/tv/${PLAYER_SCRIPT_FILE}"`);
    expect(page).toContain(`"/tv/${PLAYLIST_FILE}?v="`);
    expect(page).not.toMatch(/https?:\/\//);
  });

  it('uses hls.js wherever it runs (a timeline), native HLS only as the fallback, and has a LIVE button', () => {
    const page = playerPage('/live/');
    expect(page.indexOf('Hls.isSupported()')).toBeGreaterThan(-1);
    expect(page.indexOf('Hls.isSupported()')).toBeLessThan(page.indexOf('v.src = src'));
    expect(page).toContain('liveDurationInfinity: false');
    expect(page).not.toContain('canPlayType');
    expect(page).toContain('id="live"');
    expect(page).toContain(`${PLAYLIST_FILE}?v=" + id`);
  });
});
