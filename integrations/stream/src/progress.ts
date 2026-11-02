// The ffmpeg `-progress` parser and the report throttle. Pure: text and times in, decisions out.
// `-progress` prints `key=value` lines; a `progress=continue|end` line closes one report.

import { PROGRESS_EVERY_MS, TIME_DECIMALS, US_PER_SEC } from './constants.js';

export interface ProgressReport {
  /** Seconds of output written so far. */
  readonly doneSec: number;
  /** ffmpeg's speed, as it prints it ("1.01x", or "N/A" at the start). */
  readonly speed: string;
  /** True on the last report of the run. */
  readonly end: boolean;
}

/** Carry-over between stdout reads: a partial line, and the fields of the open report. */
export interface ProgressState {
  readonly partial: string;
  readonly fields: Readonly<Record<string, string>>;
}

export const PROGRESS_START: ProgressState = { partial: '', fields: {} };

const END_VALUE = 'end';
const CLOSING_KEY = 'progress';

// ffmpeg prints "N/A" for out_time_us before the first frame is out.
const toSeconds = (us: string | undefined): number => {
  const value = Number(us);
  return Number.isFinite(value) && value > 0 ? value / US_PER_SEC : 0;
};

/** Text in, finished reports out. A read may end mid-line; that line waits in `partial`. */
export const parseProgress = (
  state: ProgressState,
  text: string,
): { readonly state: ProgressState; readonly reports: readonly ProgressReport[] } => {
  const lines = (state.partial + text).split('\n');
  const partial = lines.pop() ?? '';
  let fields = state.fields;
  const reports: ProgressReport[] = [];
  for (const line of lines) {
    const at = line.indexOf('=');
    if (at <= 0) continue;
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    if (key !== CLOSING_KEY) {
      fields = { ...fields, [key]: value };
      continue;
    }
    reports.push({ doneSec: toSeconds(fields.out_time_us), speed: fields.speed ?? '', end: value === END_VALUE });
    fields = {};
  }
  return { state: { partial, fields }, reports };
};

/** At most one emit per interval, and always the last report. */
export const shouldEmit = (report: ProgressReport, lastEmitMs: number | null, nowMs: number): boolean =>
  report.end || lastEmitMs === null || nowMs - lastEmitMs >= PROGRESS_EVERY_MS;

export const roundTime = (sec: number): number => Number(sec.toFixed(TIME_DECIMALS));
