// Pure text work: split long plain text, escape for parse modes, check lengths before a call.
//
// Lengths are JS string lengths (UTF-16 code units). That is never less than Telegram's character
// count, so a part that fits here also fits there.

import { err, ok, type Result } from '@ignitify-integrations/runtime';
import {
  CAPTION_MAX,
  HIGH_SURROGATE_MAX,
  HIGH_SURROGATE_MIN,
  HTML_ESCAPES,
  HTML_SPECIAL,
  MARKDOWN_V2_SPECIAL,
  MESSAGES,
  SPLIT_PREFER_AFTER,
  SPLIT_SEPARATORS,
  TEXT_MAX,
  TEXT_METHODS,
} from './constants.js';

const isHighSurrogate = (code: number): boolean => code >= HIGH_SURROGATE_MIN && code <= HIGH_SURROGATE_MAX;

/** Where to cut `text` (longer than `max`): `[end of this part, start of the next]`. */
const cutPoint = (text: string, max: number): readonly [number, number] => {
  // A separator that starts at or before `max` leaves a part of at most `max` characters. Prefer one
  // in the second half, so a blank line near the start does not give a tiny part.
  for (const floor of [max * SPLIT_PREFER_AFTER, 0]) {
    for (const separator of SPLIT_SEPARATORS) {
      const at = text.lastIndexOf(separator, max);
      if (at > floor) return [at, at + separator.length];
    }
  }
  // A hard cut, never between the two halves of an emoji or another surrogate pair.
  const end = isHighSurrogate(text.charCodeAt(max - 1)) ? max - 1 : max;
  return [end, end];
};

/**
 * Split plain text into parts of at most `max` characters: at a blank line, else a line break,
 * else a space, else a hard cut. The separator at a cut is dropped. Empty text gives one empty part.
 */
export const splitText = (text: string, max: number = TEXT_MAX): readonly string[] => {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const [end, next] = cutPoint(rest, max);
    parts.push(rest.slice(0, end));
    rest = rest.slice(next);
  }
  return [...parts, rest];
};

/** Escape text for `parse_mode: 'MarkdownV2'`, outside of any entity. */
export const escapeMarkdownV2 = (text: string): string => text.replace(MARKDOWN_V2_SPECIAL, '\\$&');

/** Escape text for `parse_mode: 'HTML'`, outside of any tag. */
export const escapeHtml = (text: string): string => text.replace(HTML_SPECIAL, (char) => HTML_ESCAPES[char] ?? char);

/**
 * Check plain text and plain captions before a call, so an oversize message fails here with a clear
 * error. Formatted text is left to Telegram: its length counts only after entities parsing.
 */
export const checkLength = (method: string, params: Readonly<Record<string, unknown>>): Result<true> => {
  const plain = params['parse_mode'] === undefined;
  const { text, caption } = params;
  if (TEXT_METHODS.includes(method) && typeof text === 'string' && plain && params['entities'] === undefined) {
    if (text === '') return err(MESSAGES.textEmpty);
    if (text.length > TEXT_MAX) return err(MESSAGES.textTooLong(text.length));
  }
  if (typeof caption === 'string' && plain && params['caption_entities'] === undefined && caption.length > CAPTION_MAX)
    return err(MESSAGES.captionTooLong(caption.length));
  return ok(true);
};
