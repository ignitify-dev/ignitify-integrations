import { describe, expect, it } from 'vitest';
import { DEFAULT_HEIGHT, DEFAULT_PORT, DEFAULT_ROUTE, MESSAGES } from '../src/constants.js';
import { parseOptions, type StreamOptions } from '../src/options.js';

const URL_SOURCE = 'https://media.example.com/clip.mp4';

// Options usually come from a JSON payload, so tests pass values the types would not allow.
const parse = (options: Record<string, unknown>) => parseOptions(options as unknown as StreamOptions);
const errorsOf = (options: Record<string, unknown>): readonly string[] => {
  const result = parse(options);
  return result.ok ? [] : result.error;
};

describe('parseOptions', () => {
  it('fills every default from a source alone; no cap on seconds', () => {
    expect(parse({ source: URL_SOURCE })).toEqual({
      ok: true,
      value: {
        source: URL_SOURCE,
        profile: 'video',
        seconds: null,
        height: DEFAULT_HEIGHT,
        startDelaySec: 0,
        after: 'replay',
        lingerSec: null,
        route: DEFAULT_ROUTE,
        port: DEFAULT_PORT,
        ffmpegArgs: null,
        onProgress: null,
      },
    });
  });

  it('treats null like a missing value, as JSON payloads do', () => {
    const result = parse({ source: URL_SOURCE, seconds: null, height: null, lingerSec: null, profile: null });
    expect(result.ok && [result.value.seconds, result.value.height, result.value.profile]).toEqual([
      null,
      DEFAULT_HEIGHT,
      'video',
    ]);
  });

  it('keeps a long stream long: stream imposes no demo cap', () => {
    const result = parse({ source: URL_SOURCE, seconds: 6 * 60 * 60 });
    expect(result.ok && result.value.seconds).toBe(6 * 60 * 60);
  });

  it('accepts an absolute file path as the source', () => {
    const result = parse({ source: '/mnt/scratch/in.mp4' });
    expect(result.ok && result.value.source).toBe('/mnt/scratch/in.mp4');
  });

  it.each([
    ['http://media.example.com/a.mp4'],
    ['rtmp://media.example.com/live'],
    ['concat:/a.mp4|/b.mp4'],
    ['relative/clip.mp4'],
    ['-i'],
    [''],
    [42],
    [undefined],
  ])('refuses the source %j', (source) => {
    expect(errorsOf({ source })).toEqual([MESSAGES.badSource(source)]);
  });

  it.each([
    [{ profile: 'hd' }, MESSAGES.badProfile('hd')],
    [{ after: 'loop' }, MESSAGES.badAfter('loop')],
    [{ seconds: 0 }, MESSAGES.badPositive('seconds', 0)],
    [{ seconds: '30' }, MESSAGES.badPositive('seconds', '30')],
    [{ seconds: Infinity }, MESSAGES.badPositive('seconds', Infinity)],
    [{ lingerSec: -1 }, MESSAGES.badPositive('lingerSec', -1)],
    [{ startDelaySec: -1 }, MESSAGES.badNonNegative('startDelaySec', -1)],
    [{ height: 0 }, MESSAGES.badHeight(0)],
    [{ height: 480.5 }, MESSAGES.badHeight(480.5)],
    [{ height: 4320 }, MESSAGES.badHeight(4320)],
    [{ port: 80 }, MESSAGES.badPort(80)],
    [{ port: 70000 }, MESSAGES.badPort(70000)],
    [{ route: '/' }, MESSAGES.badRoute('/')],
    [{ route: '/live' }, MESSAGES.badRoute('/live')],
    [{ route: '/Live/' }, MESSAGES.badRoute('/Live/')],
    [{ route: '/"x"/' }, MESSAGES.badRoute('/"x"/')],
    [{ ffmpegArgs: ['-i'] }, MESSAGES.badFunction('ffmpegArgs')],
    [{ onProgress: 'log' }, MESSAGES.badFunction('onProgress')],
  ])('refuses %j', (bad, message) => {
    expect(errorsOf({ source: URL_SOURCE, ...bad })).toEqual([message]);
  });

  it('reports every bad field at once', () => {
    expect(errorsOf({ source: 'ftp://x', height: -1, port: 1 })).toEqual([
      MESSAGES.badSource('ftp://x'),
      MESSAGES.badHeight(-1),
      MESSAGES.badPort(1),
    ]);
  });

  it('refuses lingerSec with after: stop, where it would be ignored', () => {
    expect(errorsOf({ source: URL_SOURCE, after: 'stop', lingerSec: 10 })).toEqual([MESSAGES.lingerNeedsReplay]);
  });

  it('accepts lingerSec with replay and a custom route and port', () => {
    const result = parse({ source: URL_SOURCE, lingerSec: 10, route: '/tv/main/', port: 9000 });
    expect(result.ok && [result.value.lingerSec, result.value.route, result.value.port]).toEqual([
      10,
      '/tv/main/',
      9000,
    ]);
  });
});
