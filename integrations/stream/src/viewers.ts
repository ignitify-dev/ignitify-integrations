// Who is watching. Pure. The player page sends a random id per tab on every playlist request
// (`index.m3u8?v=<id>`, about every segment), so a viewer is an id seen within the last window.
// Requests are counted at the task: the ingress in front of it serves the bytes, so in-flight
// requests say nothing about viewers.

import { VIEWER_ID_PATTERN, VIEWER_LOG_MAX, VIEWER_WINDOW_MS } from './constants.js';

/** id → the last time (ms) its playlist request arrived. */
export type ViewerLog = ReadonlyMap<string, number>;

export const NO_VIEWERS: ViewerLog = new Map();

const isActive = (at: number, now: number): boolean => now - at <= VIEWER_WINDOW_MS;

/** The viewer id of a request URL, or null (no `v`, or not the player's shape). */
export const viewerId = (url: string): string | null => {
  const query = url.split('#', 1)[0]?.split('?', 2)[1];
  if (query === undefined) return null;
  const v = new URLSearchParams(query).get('v');
  return v !== null && VIEWER_ID_PATTERN.test(v) ? v : null;
};

/**
 * The log after `id` asked for the playlist at `now`: ids older than the window are dropped, and a
 * new id is not added once VIEWER_LOG_MAX are active, so made-up ids cannot grow the task's memory.
 */
export const recordViewer = (log: ViewerLog, id: string, now: number): ViewerLog => {
  const active = [...log].filter(([, at]) => isActive(at, now));
  const known = active.some(([seen]) => seen === id);
  if (!known && active.length >= VIEWER_LOG_MAX) return new Map(active);
  return new Map([...active.filter(([seen]) => seen !== id), [id, now]]);
};

/** Viewers at `now`: ids seen within the window. */
export const countViewers = (log: ViewerLog, now: number): number =>
  [...log.values()].filter((at) => isActive(at, now)).length;
