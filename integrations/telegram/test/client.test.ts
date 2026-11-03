// Contract tests against a fake Bot API on loopback. The clock (sleep) and the process stop are
// injected, so no test waits on a real timer or sends a real signal.

import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProcessStop } from '@ignitify-integrations/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOWNLOAD_MAX_BYTES, TEXT_MAX } from '../src/constants.js';
import { fromDisk, telegram, type TelegramError, type TelegramOptions } from '../src/index.js';
import {
  failed,
  fakeBotApi,
  formOf,
  jsonOf,
  success,
  type FakeBotApi,
  type Recorded,
  type Reply,
} from './fake-bot-api.js';

const TOKEN = '123456:SECRET-token_value';
const MESSAGE = { message_id: 7, date: 0, chat: { id: 1, type: 'private' }, text: 'hi' };

let api: FakeBotApi | undefined;
let dir = '';
let stopController = new AbortController();
let releases = 0;
const waits: number[] = [];
const errors: TelegramError[] = [];

const stop = (): ProcessStop => ({ signal: stopController.signal, release: () => void (releases += 1) });
const sleep = async (ms: number, signal: AbortSignal): Promise<void> => {
  waits.push(ms);
  if (signal.aborted) throw new Error('aborted');
};

const bot = async (script: (request: Recorded, index: number) => Reply, options: TelegramOptions = {}) => {
  api = await fakeBotApi(script);
  return telegram({ secrets: { TELEGRAM_BOT_TOKEN: TOKEN } }, { apiRoot: api.root, ...options }, { sleep, stop });
};

/** The error of a failed result, kept so the last test can check no error holds the token. */
const failure = <T>(result: { ok: true; value: T } | { ok: false; error: TelegramError }): TelegramError => {
  if (result.ok) throw new Error('expected a failure');
  errors.push(result.error);
  return result.error;
};

const methodOf = (request: Recorded | undefined): string => request?.path.split('/').pop() ?? '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'telegram-'));
  stopController = new AbortController();
  releases = 0;
  waits.length = 0;
});
afterEach(async () => {
  await api?.close();
  api = undefined;
  await rm(dir, { recursive: true, force: true });
});

describe('setup', () => {
  it('reads the token secret, and names only the secret when it is missing', () => {
    expect(() => telegram({ secrets: {} })).toThrow(/TELEGRAM_BOT_TOKEN is not set/);
  });

  it('refuses a bad token or bad options without printing the token', () => {
    expect(() => telegram({ secrets: { TELEGRAM_BOT_TOKEN: 'a/b' } })).toThrow(/malformed/);
    expect(() => telegram({ secrets: {} }, { token: '' })).toThrow(/malformed/);
    expect(() => telegram({ secrets: { TELEGRAM_BOT_TOKEN: TOKEN } }, { apiRoot: 'http://example.com' })).toThrow(
      /apiRoot/,
    );
  });

  it('uses the token of a second bot when given', async () => {
    const second = '999:OTHER';
    api = await fakeBotApi(() => success(true));
    const other = telegram({ secrets: {} }, { token: second, apiRoot: api.root }, { sleep, stop });
    await other.call('getMe', {});
    expect(api.requests[0]?.path).toBe(`/bot${second}/getMe`);
  });

  it('sends to the test environment path', async () => {
    const test = await bot(() => success(true), { environment: 'test' });
    await test.call('getMe', {});
    expect(api?.requests[0]?.path).toBe(`/bot${TOKEN}/test/getMe`);
  });
});

describe('call', () => {
  it('posts JSON and returns the result', async () => {
    const tg = await bot(() => success(MESSAGE));
    const result = await tg.call('sendMessage', { chat_id: 1, text: 'hi' });
    expect(result).toEqual({ ok: true, value: MESSAGE });
    expect(api?.requests[0]).toMatchObject({ method: 'POST', path: `/bot${TOKEN}/sendMessage` });
    expect(api?.requests[0]?.contentType).toContain('application/json');
    expect(jsonOf(api?.requests[0])).toEqual({ chat_id: 1, text: 'hi' });
    expect(releases).toBe(1);
  });

  it('waits retry_after on a 429, then succeeds', async () => {
    const tg = await bot((_, i) =>
      i === 0 ? failed(429, 'Too Many Requests: retry after 2', { retry_after: 2 }) : success(MESSAGE),
    );
    expect((await tg.call('sendMessage', { chat_id: 1, text: 'hi' })).ok).toBe(true);
    expect(waits).toEqual([2000]);
    expect(api?.requests).toHaveLength(2);
  });

  it('returns a 429 over the cap at once, with retryAfterSec', async () => {
    const tg = await bot(() => failed(429, 'Too Many Requests: retry after 60', { retry_after: 60 }));
    const error = failure(await tg.call('sendMessage', { chat_id: 1, text: 'hi' }));
    expect(error).toMatchObject({ kind: 'api', status: 429, retryAfterSec: 60 });
    expect(waits).toEqual([]);
  });

  it('never repeats a send after a 5xx, but retries a safe method', async () => {
    const tg = await bot((request, i) =>
      methodOf(request) === 'getChat' && i > 1 ? success({ id: 1 }) : failed(502, 'Bad Gateway'),
    );
    failure(await tg.call('sendMessage', { chat_id: 1, text: 'hi' }));
    expect(api?.requests).toHaveLength(1);
    expect((await tg.call('getChat', { chat_id: 1 })).ok).toBe(true);
    expect(api?.requests).toHaveLength(3);
  });

  it('maps a dropped connection to a network error with no token in it', async () => {
    const tg = await bot(() => ({ drop: true }));
    const error = failure(await tg.call('sendMessage', { chat_id: 1, text: 'hi' }));
    expect(error.kind).toBe('network');
    expect(error.message).toMatch(/^telegram sendMessage: network error \(/);
    expect(api?.requests).toHaveLength(1);
  });

  it('stops on the caller signal', async () => {
    const controller = new AbortController();
    const tg = await bot(() => {
      controller.abort();
      return { hold: true };
    });
    const error = failure(await tg.call('getMe', {}, { signal: controller.signal }));
    expect(error.kind).toBe('aborted');
    expect(releases).toBe(1);
  });

  it('stops on the process stop (SIGTERM)', async () => {
    const tg = await bot(() => {
      stopController.abort();
      return { hold: true };
    });
    expect(failure(await tg.call('getMe', {})).kind).toBe('aborted');
  });

  it('refuses oversize text and a bad method name before any request', async () => {
    const tg = await bot(() => success(true));
    expect(failure(await tg.call('sendMessage', { chat_id: 1, text: 'x'.repeat(TEXT_MAX + 1) })).kind).toBe('invalid');
    expect(failure(await tg.call('get/../x' as 'getMe', {})).kind).toBe('invalid');
    expect(api?.requests).toHaveLength(0);
  });
});

describe('sendText', () => {
  it('splits long plain text and sends the parts in order, with the keyboard on the last', async () => {
    const tg = await bot(() => success(MESSAGE));
    const text = Array.from({ length: 1500 }, (_, i) => `w${i % 10}xyz`).join(' ');
    const keyboard = { inline_keyboard: [[{ text: 'ok', callback_data: 'ok' }]] };
    const result = await tg.sendText(1, text, { reply_markup: keyboard, reply_parameters: { message_id: 3 } });
    expect(result.ok && result.value).toHaveLength(3);
    const bodies = api?.requests.map(jsonOf) ?? [];
    expect(bodies.map((body) => body['text']).join(' ')).toBe(text);
    expect(bodies.map((body) => body['reply_markup'] !== undefined)).toEqual([false, false, true]);
    expect(bodies.map((body) => body['reply_parameters'] !== undefined)).toEqual([true, false, false]);
  });

  it('reports the parts sent when a part fails', async () => {
    const tg = await bot((_, i) => (i === 1 ? failed(400, 'Bad Request: chat not found') : success(MESSAGE)));
    const error = failure(await tg.sendText(1, 'x'.repeat(TEXT_MAX * 2)));
    expect(error.partsSent).toBe(1);
  });

  it('sends formatted text as one message', async () => {
    const tg = await bot(() => success(MESSAGE));
    await tg.sendText(1, '<b>hi</b>', { parse_mode: 'HTML' });
    expect(api?.requests.map(jsonOf)).toEqual([{ chat_id: 1, text: '<b>hi</b>', parse_mode: 'HTML' }]);
  });
});

describe('files', () => {
  it('uploads a document byte for byte, streamed from disk', async () => {
    const bytes = randomBytes(256 * 1024);
    const path = join(dir, 'report.bin');
    await writeFile(path, bytes);
    const tg = await bot(() => success(MESSAGE));
    expect((await tg.call('sendDocument', { chat_id: 1, document: fromDisk(path), caption: 'r' })).ok).toBe(true);
    const form = await formOf(api?.requests[0]);
    const document = form.get('document') as File;
    expect(document.name).toBe('report.bin');
    expect(Buffer.from(await document.arrayBuffer()).equals(bytes)).toBe(true);
    expect(form.get('chat_id')).toBe('1');
  });

  it('uploads the file again, byte for byte, after a 429', async () => {
    const bytes = randomBytes(64 * 1024);
    const path = join(dir, 'again.bin');
    await writeFile(path, bytes);
    const tg = await bot((_, i) => (i === 0 ? failed(429, 'Too Many Requests', { retry_after: 1 }) : success(MESSAGE)));
    expect((await tg.call('sendDocument', { chat_id: 1, document: fromDisk(path) })).ok).toBe(true);
    expect(api?.requests).toHaveLength(2);
    const second = (await formOf(api?.requests[1])).get('document') as File;
    expect(Buffer.from(await second.arrayBuffer()).equals(bytes)).toBe(true);
  });

  it('uploads an album with attach:// names', async () => {
    await writeFile(join(dir, 'a.jpg'), 'A');
    await writeFile(join(dir, 'b.jpg'), 'B');
    const tg = await bot(() => success([MESSAGE, MESSAGE]));
    const media = [
      { type: 'photo' as const, media: fromDisk(join(dir, 'a.jpg')) },
      { type: 'photo' as const, media: fromDisk(join(dir, 'b.jpg')) },
    ];
    expect((await tg.call('sendMediaGroup', { chat_id: 1, media })).ok).toBe(true);
    const form = await formOf(api?.requests[0]);
    expect(JSON.parse(form.get('media') as string)).toEqual([
      { type: 'photo', media: 'attach://f0' },
      { type: 'photo', media: 'attach://f1' },
    ]);
    expect(await (form.get('f1') as File).text()).toBe('B');
  });

  it('refuses a missing file before any request', async () => {
    const tg = await bot(() => success(MESSAGE));
    const error = failure(await tg.call('sendDocument', { chat_id: 1, document: fromDisk(join(dir, 'none')) }));
    expect(error).toMatchObject({ kind: 'invalid' });
    expect(error.message).toContain('ENOENT');
    expect(api?.requests).toHaveLength(0);
  });

  it('refuses to download a file over 20 MB, with no GET', async () => {
    const tg = await bot(() =>
      success({ file_id: 'f', file_unique_id: 'u', file_size: DOWNLOAD_MAX_BYTES + 1, file_path: 'documents/x' }),
    );
    expect(failure(await tg.download('f', join(dir, 'x'))).kind).toBe('invalid');
    expect(api?.requests).toHaveLength(1);
  });

  it('streams a download to disk', async () => {
    const bytes = randomBytes(100 * 1024);
    const tg = await bot((request) =>
      request.method === 'GET'
        ? { raw: bytes }
        : success({ file_id: 'f', file_unique_id: 'u', file_size: bytes.length, file_path: 'documents/x.bin' }),
    );
    const to = join(dir, 'x.bin');
    expect(await tg.download('f', to)).toEqual({ ok: true, value: { path: to, size: bytes.length } });
    expect((await readFile(to)).equals(bytes)).toBe(true);
    expect(api?.requests[1]?.path).toBe(`/file/bot${TOKEN}/documents/x.bin`);
  });

  it('removes a partial download and reports the HTTP status', async () => {
    const tg = await bot((request) =>
      request.method === 'GET'
        ? { status: 404, raw: 'nope' }
        : success({ file_id: 'f', file_unique_id: 'u', file_path: 'documents/x.bin' }),
    );
    const to = join(dir, 'x.bin');
    expect(failure(await tg.download('f', to))).toMatchObject({ kind: 'api', status: 404 });
    await expect(stat(to)).rejects.toThrow();
  });
});

describe('secrecy', () => {
  it('no error and no console output holds the token', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((name) => vi.spyOn(console, name));
    const tg = await bot((request) =>
      methodOf(request) === 'getMe' ? { drop: true } : failed(400, `Bad Request /bot${TOKEN}/x`),
    );
    failure(await tg.call('getMe', {}));
    failure(await tg.call('sendMessage', { chat_id: 1, text: 'hi' }));
    expect(errors.length).toBeGreaterThan(5);
    expect(JSON.stringify(errors)).not.toContain(TOKEN);
    const printed = spies.flatMap((spy) => spy.mock.calls.flat().map(String));
    expect(printed.join('\n')).not.toContain(TOKEN);
    spies.forEach((spy) => spy.mockRestore());
  });
});
