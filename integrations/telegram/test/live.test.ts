// The live test, run by hand once before a release against the real Bot API:
//   TELEGRAM_LIVE_TOKEN=... TELEGRAM_LIVE_CHAT_ID=... npx vitest run integrations/telegram/test/live.test.ts
// Skipped without both variables, so CI never needs a token. It leaves no messages behind.

import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEXT_MAX } from '../src/constants.js';
import { fromDisk, telegram } from '../src/index.js';

const token = process.env['TELEGRAM_LIVE_TOKEN'] ?? '';
const chatId = process.env['TELEGRAM_LIVE_CHAT_ID'] ?? '';
const LIVE = token !== '' && chatId !== '';
const ctx = { secrets: { TELEGRAM_BOT_TOKEN: token }, chunk: () => undefined, metric: () => undefined };

describe.skipIf(!LIVE)('live Bot API', () => {
  it('sends long text, uploads, downloads and cleans up', async () => {
    const tg = telegram(ctx);
    const dir = await mkdtemp(join(tmpdir(), 'telegram-live-'));
    const sent: number[] = [];
    try {
      const text = await tg.sendText(chatId, `live test ${'x'.repeat(TEXT_MAX)}`);
      expect(text.ok && text.value).toHaveLength(2);
      if (text.ok) sent.push(...text.value.map((m) => m.message_id));

      const bytes = randomBytes(64 * 1024);
      const upload = join(dir, 'live.bin');
      await writeFile(upload, bytes);
      const doc = await tg.call('sendDocument', { chat_id: chatId, document: fromDisk(upload) });
      expect(doc.ok).toBe(true);
      if (!doc.ok || !('document' in doc.value)) return;
      sent.push(doc.value.message_id);

      const down = await tg.download(doc.value.document.file_id, join(dir, 'back.bin'));
      expect(down.ok).toBe(true);
      expect((await readFile(join(dir, 'back.bin'))).equals(bytes)).toBe(true);
    } finally {
      if (sent.length > 0) await tg.call('deleteMessages', { chat_id: chatId, message_ids: sent });
      await rm(dir, { recursive: true, force: true });
    }
  });
});
