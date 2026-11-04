// What the inbound server answers, decided from the URL path alone. Pure.
// Under the route: the player page, hls.js, and the `.m3u8` / `.ts` files of ONE folder.
// Everything else is 404: no sub-folders, no dot names, no other extensions.

import { extname } from 'node:path';
import type { TaskCtx } from '@ignitify-integrations/runtime';
import {
  DEFAULT_ROUTE,
  LIVE_EDGE_SEC,
  MEDIA_STEM_PATTERN,
  MEDIA_TYPES,
  PLAYER_POLL_MS,
  PLAYER_SCRIPT_FILE,
  PLAYLIST_FILE,
} from './constants.js';

export type Route =
  | { readonly kind: 'player' }
  | { readonly kind: 'script' }
  | { readonly kind: 'media'; readonly name: string; readonly type: string }
  | { readonly kind: 'none' };

const NONE: Route = { kind: 'none' };

/** `route` is a checked prefix such as `/live/`; `urlPath` is the request's decoded-or-not pathname. */
export const resolveRoute = (urlPath: string, route: string): Route => {
  if (urlPath === route || urlPath === route.slice(0, -1)) return { kind: 'player' };
  if (!urlPath.startsWith(route)) return NONE;
  const name = urlPath.slice(route.length);
  if (name === PLAYER_SCRIPT_FILE) return { kind: 'script' };
  const ext = extname(name);
  const type = MEDIA_TYPES[ext];
  if (type === undefined || !MEDIA_STEM_PATTERN.test(name.slice(0, -ext.length))) return NONE;
  return { kind: 'media', name, type };
};

/** The public viewer address: this deployment's host (from the callback URL) + the route. */
export const viewerUrl = (callbackUrl: string | null, route: string): string | null =>
  callbackUrl === null ? null : `${new URL(callbackUrl).origin}${route}`;

/**
 * The viewer link, for task code that tells people about the stream before or while it runs
 * (stream() sends the same link to the caller as its first chunk). Null when the run has no callback.
 */
export const watchUrl = (ctx: Pick<TaskCtx, 'callback'>, route: string = DEFAULT_ROUTE): string | null =>
  viewerUrl(ctx.callback?.url ?? null, route);

// Paths are absolute so the page works at both `/live/` and `/live`. The playlist does not exist
// until the first segment is written, so the page polls until it does, then plays.
// hls.js first, wherever it runs (Chrome, Edge, Firefox): with a finite duration the video has a
// timeline from the start (the event playlist keeps every segment). Native HLS reports a live
// stream as endless and shows no timeline, so it is used only where hls.js cannot run (iOS Safari).
// The LIVE button is red at the live edge, grey behind it; a click goes back to live. It hides when
// the stream has ended.
export const playerPage = (route: string): string => `<!doctype html><meta charset="utf-8"><title>Live</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<body style="margin:0;background:#000">
<video id="v" controls autoplay muted playsinline style="width:100%;height:100vh"></video>
<button id="live" style="position:fixed;top:12px;right:12px;border:0;border-radius:4px;padding:6px 10px;color:#fff;background:#555;font:600 13px sans-serif;cursor:pointer">LIVE</button>
<script src="${route}${PLAYER_SCRIPT_FILE}"></script>
<script>
  // One id per tab, on every playlist request, so the task can count viewers (src/viewers.ts).
  const id = Math.random().toString(36).slice(2, 12).padEnd(6, "0");
  const v = document.getElementById("v"), b = document.getElementById("live"), src = "${route}${PLAYLIST_FILE}?v=" + id;
  let h = null;
  const edge = () => (h && h.liveSyncPosition) || (v.seekable.length ? v.seekable.end(v.seekable.length - 1) : 0);
  b.onclick = () => { const e = edge(); if (e) v.currentTime = e; v.play(); };
  setInterval(() => { b.style.background = edge() - v.currentTime < ${LIVE_EDGE_SEC} ? "#c00" : "#555"; }, 1000);
  const play = () => {
    if (window.Hls && Hls.isSupported()) {
      h = new Hls({ liveDurationInfinity: false });
      h.on(Hls.Events.LEVEL_UPDATED, (_, d) => { if (!d.details.live) b.hidden = true; });
      h.loadSource(src);
      h.attachMedia(v);
    } else v.src = src;
  };
  const retry = () => setTimeout(wait, ${PLAYER_POLL_MS});
  const wait = () => fetch(src, { cache: "no-store" }).then((r) => (r.ok ? play() : retry()), retry);
  wait();
</script></body>`;
