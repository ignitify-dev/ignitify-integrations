// The public surface of v1, exactly (the plan's D2). A new single-method helper needs its own value test.
export { telegram } from './telegram.js';
export type { SendTextOptions, Telegram } from './telegram.js';
export type { TelegramDeps } from './client.js';
export type { Environment, TelegramOptions } from './config.js';
export { fromDisk } from './files.js';
export type { Downloaded } from './files.js';
export type { UpdatesOptions } from './updates.js';
export type { UpdateType } from './poll.js';
export { escapeHtml, escapeMarkdownV2, splitText } from './text.js';
export type { CallOptions, DiskFile, Method, Params, Returns, TelegramError, TelegramErrorKind } from './types.js';
export { CAPTION_MAX, DOWNLOAD_MAX_BYTES, TEXT_MAX, UPLOAD_MAX_BYTES } from './constants.js';
