import { describe, expect, it } from 'vitest';
import { PROGRESS_EVERY_MS } from '../src/constants.js';
import { PROGRESS_START, parseProgress, roundTime, shouldEmit, type ProgressState } from '../src/progress.js';

// Two reports as ffmpeg 8 prints them with `-progress pipe:1`.
const OUTPUT = [
  'frame=12',
  'out_time_us=N/A',
  'speed=N/A',
  'progress=continue',
  'frame=48',
  'bitrate=N/A',
  'out_time_us=2020136',
  'out_time=00:00:02.020136',
  'speed=1.34x',
  'progress=end',
  '',
].join('\n');

const feed = (pieces: readonly string[]) =>
  pieces.reduce<{ state: ProgressState; reports: unknown[] }>(
    (acc, piece) => {
      const next = parseProgress(acc.state, piece);
      return { state: next.state, reports: [...acc.reports, ...next.reports] };
    },
    { state: PROGRESS_START, reports: [] },
  );

const EXPECTED = [
  { doneSec: 0, speed: 'N/A', end: false },
  { doneSec: 2.020136, speed: '1.34x', end: true },
];

describe('parseProgress', () => {
  it('turns each progress= line into one report; N/A time counts as 0', () => {
    expect(feed([OUTPUT]).reports).toEqual(EXPECTED);
  });

  it('gives the same reports however stdout is split, even mid-key and mid-value', () => {
    for (const size of [1, 3, 7, 16]) {
      const pieces = OUTPUT.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) ?? [];
      expect(feed(pieces).reports).toEqual(EXPECTED);
    }
  });

  it('holds a partial last line and an open report until the next read', () => {
    const first = parseProgress(PROGRESS_START, 'out_time_us=1000000\nspeed=1x\nprog');
    expect(first.reports).toEqual([]);
    expect(first.state.partial).toBe('prog');
    expect(parseProgress(first.state, 'ress=continue\n').reports).toEqual([{ doneSec: 1, speed: '1x', end: false }]);
  });

  it('ignores lines without a key and starts each report from empty fields', () => {
    const text = 'garbage\n=x\nout_time_us=3000000\nprogress=continue\nprogress=continue\n';
    expect(feed([text]).reports).toEqual([
      { doneSec: 3, speed: '', end: false },
      { doneSec: 0, speed: '', end: false },
    ]);
  });
});

describe('shouldEmit', () => {
  const mid = { doneSec: 1, speed: '1x', end: false };
  it('emits the first report, then at most one per interval', () => {
    expect(shouldEmit(mid, null, 0)).toBe(true);
    expect(shouldEmit(mid, 1000, 1000 + PROGRESS_EVERY_MS - 1)).toBe(false);
    expect(shouldEmit(mid, 1000, 1000 + PROGRESS_EVERY_MS)).toBe(true);
  });
  it('always emits the last report', () => {
    expect(shouldEmit({ ...mid, end: true }, 1000, 1001)).toBe(true);
  });
});

describe('roundTime', () => {
  it('rounds to tenths of a second', () => {
    expect(roundTime(2.020136)).toBe(2);
    expect(roundTime(2.06)).toBe(2.1);
  });
});
