// What the inbound server answers, decided from the URL path alone. Pure.
// Under the route: the player page, hls.js, and the `.m3u8` / `.ts` files of ONE folder.
// Everything else is 404: no sub-folders, no dot names, no other extensions.

import { extname } from 'node:path';
import type { TaskCtx } from '@ignitify-integrations/runtime';
import {
  DEFAULT_ROUTE,
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
// until the first segment is written, so the page polls until it does, then plays. Safari plays
// HLS natively; every other browser uses hls.js.
export const playerPage = (route: string): string => `<!doctype html><meta charset="utf-8"><title>Live</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<body style="margin:0;background:#000">
<video id="v" controls autoplay muted playsinline style="width:100%;height:100vh"></video>
<script src="${route}${PLAYER_SCRIPT_FILE}"></script>
<script>
  const v = document.getElementById("v"), src = "${route}${PLAYLIST_FILE}";
  const play = () => {
    if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = src;
    else { const h = new Hls(); h.loadSource(src); h.attachMedia(v); }
  };
  const retry = () => setTimeout(wait, ${PLAYER_POLL_MS});
  const wait = () => fetch(src, { cache: "no-store" }).then((r) => (r.ok ? play() : retry()), retry);
  wait();
</script></body>`;
