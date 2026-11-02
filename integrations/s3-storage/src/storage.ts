// Thin shell: reads secrets, does the file and network I/O. Every decision lives in config.ts.
// The S3 effects are injectable, so tests run without a network.

import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandInput,
  type PutObjectCommandInput,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readSecret, unwrap, type TaskCtx } from '@ignitify-integrations/runtime';
import {
  checkCredentials,
  checkSize,
  clientConfig,
  parseOptions,
  redact,
  resolveExpiry,
  resolveKey,
  validateKey,
  type StorageOptions,
} from './config.js';
import { DEFAULT_CONTENT_TYPE, MESSAGES, SECRET_ACCESS_KEY_ID, SECRET_SECRET_ACCESS_KEY } from './constants.js';

export interface S3Effects {
  readonly put: (input: PutObjectCommandInput) => Promise<void>;
  /** The object as a Node stream, or undefined when the server sent no readable body. */
  readonly get: (input: GetObjectCommandInput) => Promise<Readable | undefined>;
  readonly presign: (input: GetObjectCommandInput, expiresSec: number) => Promise<string>;
}

export interface StorageDeps {
  readonly createEffects: (config: S3ClientConfig) => S3Effects;
  readonly newId: () => string;
}

export interface PutOptions {
  /** Object key; default `<random id>/<file name>`. */
  readonly key?: string;
  readonly contentType?: string;
}

export interface LinkOptions extends PutOptions {
  /** Link lifetime in seconds; default 1 hour, at most 7 days. */
  readonly expiresSec?: number;
}

export interface PutResult {
  readonly key: string;
  readonly size: number;
}

export interface Storage {
  /** Upload a file (streamed, not read into memory). */
  put(filePath: string, options?: PutOptions): Promise<PutResult>;
  /** Download an object to a file (streamed). */
  get(key: string, filePath: string): Promise<void>;
  /** Upload a file and return a presigned GET link to it. */
  putAndLink(filePath: string, options?: LinkOptions): Promise<string>;
}

const sdkEffects = (config: S3ClientConfig): S3Effects => {
  const client = new S3Client(config);
  return {
    put: async (input) => {
      await client.send(new PutObjectCommand(input));
    },
    get: async (input) => {
      // In Node the SDK body is a Readable; anything else (a browser stream) is not ours to handle.
      const body = (await client.send(new GetObjectCommand(input))).Body;
      return body instanceof Readable ? body : undefined;
    },
    presign: (input, expiresSec) => getSignedUrl(client, new GetObjectCommand(input), { expiresIn: expiresSec }),
  };
};

const defaultDeps: StorageDeps = { createEffects: sdkEffects, newId: randomUUID };

/** A short, secret-free description of an SDK or file-system failure. */
const describe = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return `${error.name}${status === undefined ? '' : ` (HTTP ${status})`}: ${error.message}`;
};

export const storage = (
  ctx: Pick<TaskCtx, 'secrets'>,
  options: StorageOptions,
  deps: StorageDeps = defaultDeps,
): Storage => {
  const config = unwrap(parseOptions(options));
  const credentials =
    options.credentials === undefined
      ? {
          accessKeyId: unwrap(readSecret(ctx, SECRET_ACCESS_KEY_ID)),
          secretAccessKey: unwrap(readSecret(ctx, SECRET_SECRET_ACCESS_KEY)),
        }
      : unwrap(checkCredentials(options.credentials));
  const secrets = [credentials.accessKeyId, credentials.secretAccessKey];
  const effects = deps.createEffects(clientConfig(config, credentials));

  // Errors carry no cause: an SDK error holds the request, and the request holds the signature.
  const attempt = async <T>(operation: string, key: string, run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      // eslint-disable-next-line preserve-caught-error -- the cause is dropped on purpose (see above)
      throw new Error(redact(MESSAGES.failed(operation, key, describe(error)), secrets));
    }
  };

  const put = async (filePath: string, putOptions: PutOptions = {}): Promise<PutResult> => {
    const key = unwrap(resolveKey(filePath, putOptions.key, deps.newId()));
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error(MESSAGES.notAFile(filePath));
    const size = unwrap(checkSize(filePath, info.size));
    await attempt('put', key, () =>
      effects.put({
        Bucket: config.bucket,
        Key: key,
        Body: createReadStream(filePath),
        // A stream has no length of its own; S3 needs it to accept a single PUT.
        ContentLength: size,
        ContentType: putOptions.contentType ?? DEFAULT_CONTENT_TYPE,
      }),
    );
    return { key, size };
  };

  const get = async (key: string, filePath: string): Promise<void> => {
    const checked = unwrap(validateKey(key));
    await attempt('get', checked, async () => {
      const body = await effects.get({ Bucket: config.bucket, Key: checked });
      if (body === undefined) throw new Error(MESSAGES.noBody(checked));
      await pipeline(body, createWriteStream(filePath));
    });
  };

  const putAndLink = async (filePath: string, linkOptions: LinkOptions = {}): Promise<string> => {
    // Checked before the upload, so a bad expiry never leaves an orphan object.
    const expiresSec = unwrap(resolveExpiry(linkOptions.expiresSec));
    const { key } = await put(filePath, linkOptions);
    return attempt('presign', key, () => effects.presign({ Bucket: config.bucket, Key: key }, expiresSec));
  };

  return { put, get, putAndLink };
};
