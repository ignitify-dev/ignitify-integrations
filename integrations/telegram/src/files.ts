// Thin shell: files on the scratch disk. An upload is streamed from disk (never read into memory);
// a download is streamed to disk after a size check.

import { createWriteStream, openAsBlob } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import type { File } from '@grammyjs/types';
import { err, ok, type Result } from '@ignitify-integrations/runtime';
import type { Client } from './client.js';
import { DISK_FILE_KIND, DOWNLOAD_LABEL, DOWNLOAD_MAX_BYTES, MESSAGES, UPLOAD_MAX_BYTES } from './constants.js';
import { failure } from './response.js';
import type { CallOptions, DiskFile, TelegramError } from './types.js';

export interface Downloaded {
  readonly path: string;
  readonly size: number;
}

/** A file on disk to upload: pass it as any file field, e.g. `{ document: fromDisk(path) }`. */
export const fromDisk = (path: string, filename: string = basename(path)): DiskFile => ({
  kind: DISK_FILE_KIND,
  path,
  filename,
});

const errorCode = (error: unknown): string => {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof code === 'string' ? code : error instanceof Error ? error.name : typeof error;
};

/** The file as a Blob that reads from disk when sent, after the 50 MB check. */
export const openUpload = async (file: DiskFile): Promise<Result<Blob>> => {
  try {
    const info = await stat(file.path);
    if (!info.isFile()) return err(MESSAGES.fileUnreadable(file.path, MESSAGES.notAFile));
    if (info.size > UPLOAD_MAX_BYTES) return err(MESSAGES.fileTooLarge(file.path, info.size));
    return ok(await openAsBlob(file.path));
  } catch (error) {
    return err(MESSAGES.fileUnreadable(file.path, errorCode(error)));
  }
};

/** Stream an answer body to `toPath`. A partial file is removed. */
const save = async (
  response: Response,
  toPath: string,
  secrets: readonly string[],
): Promise<Result<Downloaded, TelegramError>> => {
  if (!response.ok || response.body === null) {
    // Free the connection now, not at garbage collection.
    await response.body?.cancel();
    return err(
      failure('api', DOWNLOAD_LABEL, MESSAGES.http(response.status, response.statusText), secrets, {
        status: response.status,
      }),
    );
  }
  const out = createWriteStream(toPath);
  let writeError: unknown;
  out.once('error', (error) => {
    writeError = error;
  });
  try {
    await pipeline(Readable.fromWeb(response.body as ReadableStream<Uint8Array>), out);
    return ok({ path: toPath, size: out.bytesWritten });
  } catch (error) {
    await rm(toPath, { force: true });
    if (writeError !== undefined)
      return err(failure('invalid', DOWNLOAD_LABEL, MESSAGES.writeFailed(toPath, errorCode(writeError)), secrets));
    // A read failure: the caller's catch names it (stopped, timeout or network).
    throw error;
  }
};

/** `getFile`, the 20 MB check (no GET when it fails), then the file streamed to `toPath`. */
export const download = async (
  client: Client,
  fileId: string,
  toPath: string,
  opts: CallOptions = {},
): Promise<Result<Downloaded, TelegramError>> => {
  const found = await client.call('getFile', { file_id: fileId }, opts);
  if (!found.ok) return found;
  const file = found.value as File;
  if (file.file_size !== undefined && file.file_size > DOWNLOAD_MAX_BYTES)
    return err(failure('invalid', DOWNLOAD_LABEL, MESSAGES.downloadTooLarge(file.file_size), client.secrets));
  if (file.file_path === undefined) return err(failure('invalid', DOWNLOAD_LABEL, MESSAGES.noFilePath, client.secrets));
  return client.getFile(file.file_path, opts, (response) => save(response, toPath, client.secrets));
};
