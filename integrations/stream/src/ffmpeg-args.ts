// The engine arguments: one pure profile per output kind. This is the only media logic of this integration,
// and a task can change or replace it with the `ffmpegArgs` option.

import type { Profile, StreamConfig } from './options.js';

/** Where the engine writes. The HLS folder is the only folder the server reads from. */
export interface StreamPaths {
  readonly hlsDir: string;
  readonly playlist: string;
}

export type FfmpegArgsFn = (defaults: readonly string[], paths: StreamPaths) => readonly string[];

type ProfileInput = Pick<StreamConfig, 'source' | 'seconds' | 'height'>;

const AUDIO_CODEC = ['-c:a', 'aac', '-b:a', '128k'] as const;

// `-progress pipe:1` feeds the progress reports; a replacement must keep it to keep them.
// `-re` reads at playback speed, so the stream is live, not a fast transcode.
const input = (p: ProfileInput): readonly string[] => [
  '-hide_banner',
  '-nostats',
  '-loglevel',
  'error',
  '-progress',
  'pipe:1',
  '-re',
  '-i',
  p.source,
  ...(p.seconds === null ? [] : ['-t', String(p.seconds)]),
];

// A keyframe every 48 frames with no scene-cut keyframes gives segments of an even length.
const video = (p: ProfileInput): readonly string[] => [
  '-vf',
  `scale=-2:${p.height}`,
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-g',
  '48',
  '-sc_threshold',
  '0',
  ...AUDIO_CODEC,
];

const audio = (): readonly string[] => ['-vn', ...AUDIO_CODEC];

// An "event" playlist keeps every segment, so a late viewer can seek to the start and replay it.
const hls = (paths: StreamPaths): readonly string[] => [
  '-f',
  'hls',
  '-hls_time',
  '4',
  '-hls_list_size',
  '0',
  '-hls_playlist_type',
  'event',
  paths.playlist,
];

const PROFILE_ARGS: Readonly<Record<Profile, (p: ProfileInput) => readonly string[]>> = { video, audio };

const defaultArgs = (config: ProfileInput & Pick<StreamConfig, 'profile'>, paths: StreamPaths): readonly string[] => [
  ...input(config),
  ...PROFILE_ARGS[config.profile](config),
  ...hls(paths),
];

/** The arguments ffmpeg runs with: the profile, passed through the task's `ffmpegArgs` if it has one. */
export const ffmpegArgs = (
  config: Pick<StreamConfig, 'source' | 'seconds' | 'height' | 'profile' | 'ffmpegArgs'>,
  paths: StreamPaths,
): readonly string[] => {
  const defaults = defaultArgs(config, paths);
  return config.ffmpegArgs === null ? defaults : config.ffmpegArgs(defaults, paths);
};
