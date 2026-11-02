import { describe, expect, it } from 'vitest';
import { ffmpegArgs, type FfmpegArgsFn, type StreamPaths } from '../src/ffmpeg-args.js';

const paths: StreamPaths = { hlsDir: '/home/t/hls', playlist: '/home/t/hls/index.m3u8' };
const base = { source: 'https://media.example.com/a.mp4', seconds: 30, height: 360, ffmpegArgs: null };

const valueAfter = (args: readonly string[], flag: string): string | undefined => args[args.indexOf(flag) + 1];

describe('ffmpegArgs', () => {
  it('video: x264 scaled to the height, AAC, an event playlist at the given path', () => {
    const args = ffmpegArgs({ ...base, profile: 'video' }, paths);
    expect(valueAfter(args, '-i')).toBe(base.source);
    expect(valueAfter(args, '-t')).toBe('30');
    expect(valueAfter(args, '-vf')).toBe('scale=-2:360');
    expect(valueAfter(args, '-c:v')).toBe('libx264');
    expect(valueAfter(args, '-c:a')).toBe('aac');
    expect(valueAfter(args, '-hls_playlist_type')).toBe('event');
    expect(args.at(-1)).toBe(paths.playlist);
  });

  it('both profiles read live (-re) and report progress on stdout', () => {
    for (const profile of ['video', 'audio'] as const) {
      const args = ffmpegArgs({ ...base, profile }, paths);
      expect(args).toContain('-re');
      expect(valueAfter(args, '-progress')).toBe('pipe:1');
      expect(args.indexOf('-re')).toBeLessThan(args.indexOf('-i'));
    }
  });

  it('audio: no picture, no video codec, no scale; height plays no part', () => {
    const args = ffmpegArgs({ ...base, profile: 'audio' }, paths);
    expect(args).toContain('-vn');
    expect(args).not.toContain('-c:v');
    expect(args).not.toContain('-vf');
    expect(ffmpegArgs({ ...base, profile: 'audio', height: 1080 }, paths)).toEqual(args);
    expect(valueAfter(args, '-c:a')).toBe('aac');
  });

  it('streams the whole source when seconds is not set', () => {
    expect(ffmpegArgs({ ...base, seconds: null, profile: 'video' }, paths)).not.toContain('-t');
  });

  it('escape hatch: receives the defaults and the paths; its result is used as is', () => {
    const seen: { defaults?: readonly string[]; paths?: StreamPaths } = {};
    const replace: FfmpegArgsFn = (defaults, p) => {
      seen.defaults = defaults;
      seen.paths = p;
      return ['-i', 'x', p.playlist];
    };
    const defaults = ffmpegArgs({ ...base, profile: 'video' }, paths);
    expect(ffmpegArgs({ ...base, profile: 'video', ffmpegArgs: replace }, paths)).toEqual(['-i', 'x', paths.playlist]);
    expect(seen).toEqual({ defaults, paths });
  });
});
