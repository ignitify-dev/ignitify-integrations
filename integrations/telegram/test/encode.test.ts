import { describe, expect, it } from 'vitest';
import { encodeParams, isDiskFile } from '../src/encode.js';
import { fromDisk } from '../src/files.js';

describe('encodeParams', () => {
  it('sends JSON when no file is attached, without undefined fields', () => {
    expect(encodeParams({ chat_id: 1, text: 'hi', reply_markup: undefined })).toEqual({
      kind: 'json',
      body: '{"chat_id":1,"text":"hi"}',
    });
  });

  it('puts a top-level file in its own part, and other fields as strings or JSON', () => {
    const file = fromDisk('/scratch/report.pdf');
    expect(encodeParams({ chat_id: 1, document: file, caption: 'r', disable_notification: true })).toEqual({
      kind: 'multipart',
      fields: [
        ['chat_id', '1'],
        ['caption', 'r'],
        ['disable_notification', 'true'],
      ],
      files: [['document', file]],
    });
  });

  it('sends nested files as attach:// names, in order', () => {
    const a = fromDisk('/scratch/a.jpg');
    const b = fromDisk('/scratch/b.jpg');
    const encoded = encodeParams({
      chat_id: 1,
      media: [
        { type: 'photo', media: a, caption: undefined },
        { type: 'photo', media: b },
        { type: 'photo', media: 'https://example.com/c.jpg' },
      ],
    });
    expect(encoded).toEqual({
      kind: 'multipart',
      fields: [
        ['chat_id', '1'],
        [
          'media',
          JSON.stringify([
            { type: 'photo', media: 'attach://f0' },
            { type: 'photo', media: 'attach://f1' },
            { type: 'photo', media: 'https://example.com/c.jpg' },
          ]),
        ],
      ],
      files: [
        ['f0', a],
        ['f1', b],
      ],
    });
  });

  it('sends a top-level thumbnail as attach://, as the Bot API asks', () => {
    const video = fromDisk('/scratch/v.mp4');
    const thumb = fromDisk('/scratch/t.jpg');
    expect(encodeParams({ chat_id: 1, video, thumbnail: thumb })).toEqual({
      kind: 'multipart',
      fields: [
        ['chat_id', '1'],
        ['thumbnail', 'attach://f1'],
      ],
      files: [
        ['video', video],
        ['f1', thumb],
      ],
    });
  });
});

describe('fromDisk', () => {
  it('names the file after its path by default', () => {
    expect(fromDisk('/scratch/out/report.pdf')).toEqual({
      kind: 'disk-file',
      path: '/scratch/out/report.pdf',
      filename: 'report.pdf',
    });
    expect(fromDisk('/scratch/x', 'y.txt').filename).toBe('y.txt');
    expect(isDiskFile(fromDisk('/a'))).toBe(true);
    expect(isDiskFile({ kind: 'disk-file' })).toBe(false);
  });
});
