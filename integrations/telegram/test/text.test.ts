import { describe, expect, it } from 'vitest';
import { CAPTION_MAX, TEXT_MAX } from '../src/constants.js';
import { checkLength, escapeHtml, escapeMarkdownV2, splitText } from '../src/text.js';

describe('splitText', () => {
  it('keeps text within the limit as one part', () => {
    expect(splitText('hello')).toEqual(['hello']);
    expect(splitText('x'.repeat(TEXT_MAX))).toHaveLength(1);
  });

  it('gives one empty part for empty text', () => {
    expect(splitText('')).toEqual(['']);
  });

  it('never makes a part longer than the limit, and keeps every character but the cut separators', () => {
    const text = Array.from(
      { length: 700 },
      (_, i) => `word${i}${i % 50 === 0 ? '\n\n' : i % 9 === 0 ? '\n' : ' '}`,
    ).join('');
    const parts = splitText(text, 1000);
    expect(parts.every((part) => part.length <= 1000 && part.length > 0)).toBe(true);
    expect(parts.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
  });

  it('prefers a blank line, then a line break, then a space', () => {
    expect(splitText('aaaaaaaa\n\nbb\ncc dd', 14)).toEqual(['aaaaaaaa', 'bb\ncc dd']);
    expect(splitText('aaaaaaaa\nbb cc dd', 14)).toEqual(['aaaaaaaa', 'bb cc dd']);
    expect(splitText('aaaaaa bb', 8)).toEqual(['aaaaaa', 'bb']);
  });

  it('does not cut at a separator near the start when a later one exists', () => {
    expect(splitText('a\n\nbbbbbbb ccc', 12)).toEqual(['a\n\nbbbbbbb', 'ccc']);
  });

  it('cuts hard when there is no separator, and never inside a surrogate pair', () => {
    expect(splitText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
    const parts = splitText('abc😀def', 4);
    expect(parts).toEqual(['abc', '😀de', 'f']);
  });
});

describe('escape', () => {
  it('escapes every MarkdownV2 special character and the backslash', () => {
    const special = '_*[]()~`>#+-=|{}.!\\';
    expect(escapeMarkdownV2(special)).toBe([...special].map((c) => `\\${c}`).join(''));
    expect(escapeMarkdownV2('plain text 1')).toBe('plain text 1');
  });

  it('escapes &, < and > for HTML', () => {
    expect(escapeHtml('a < b && c > d')).toBe('a &lt; b &amp;&amp; c &gt; d');
  });
});

describe('checkLength', () => {
  it('refuses empty and oversize plain message text', () => {
    expect(checkLength('sendMessage', { text: '' }).ok).toBe(false);
    expect(checkLength('sendMessage', { text: 'x'.repeat(TEXT_MAX + 1) }).ok).toBe(false);
    expect(checkLength('editMessageText', { text: 'x'.repeat(TEXT_MAX + 1) }).ok).toBe(false);
    expect(checkLength('sendMessage', { text: 'x'.repeat(TEXT_MAX) }).ok).toBe(true);
  });

  it('leaves formatted text to Telegram, and `text` of other methods alone', () => {
    expect(checkLength('sendMessage', { text: 'x'.repeat(TEXT_MAX + 1), parse_mode: 'HTML' }).ok).toBe(true);
    expect(checkLength('sendMessage', { text: 'x'.repeat(TEXT_MAX + 1), entities: [] }).ok).toBe(true);
    expect(checkLength('answerCallbackQuery', { text: '' }).ok).toBe(true);
  });

  it('refuses an oversize plain caption on any method', () => {
    expect(checkLength('sendPhoto', { caption: 'x'.repeat(CAPTION_MAX + 1) }).ok).toBe(false);
    expect(checkLength('sendPhoto', { caption: 'x'.repeat(CAPTION_MAX) }).ok).toBe(true);
    expect(checkLength('sendPhoto', { caption: 'x'.repeat(CAPTION_MAX + 1), parse_mode: 'HTML' }).ok).toBe(true);
  });
});
