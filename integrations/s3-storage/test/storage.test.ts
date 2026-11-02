import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';
import type { PutObjectCommandInput, S3ClientConfig } from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { storage, type S3Effects } from '../src/index.js';

const secrets = { S3_ACCESS_KEY_ID: 'AKIDVALUE', S3_SECRET_ACCESS_KEY: 'SECRETVALUE' };
const options = { bucket: 'acme-reports', region: 'eu-west-1' };

interface Recorder {
  readonly config: S3ClientConfig[];
  readonly puts: PutObjectCommandInput[];
  readonly bodies: string[];
}

const fake = (overrides: Partial<S3Effects> = {}) => {
  const seen: Recorder = { config: [], puts: [], bodies: [] };
  const createEffects = (config: S3ClientConfig): S3Effects => {
    seen.config.push(config);
    return {
      put: async (input) => {
        seen.puts.push(input);
        seen.bodies.push(await text(input.Body as Readable));
      },
      get: async () => Readable.from([Buffer.from('downloaded')]),
      presign: async (input, expiresSec) => `https://signed/${input.Key}?X-Amz-Expires=${expiresSec}`,
      ...overrides,
    };
  };
  return { seen, deps: { createEffects, newId: () => 'run-1' } };
};

let dir = '';
let file = '';
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 's3-storage-'));
  file = join(dir, 'report.csv');
  await writeFile(file, 'a,b\n1,2\n');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('storage setup', () => {
  it('reads the default secrets', () => {
    const { seen, deps } = fake();
    storage({ secrets }, options, deps);
    expect(seen.config[0]?.credentials).toEqual({ accessKeyId: 'AKIDVALUE', secretAccessKey: 'SECRETVALUE' });
  });

  it('uses explicit credentials for a second account, and does not need the default secrets', () => {
    const { seen, deps } = fake();
    storage({ secrets: {} }, { ...options, credentials: { accessKeyId: 'a', secretAccessKey: 's' } }, deps);
    expect(seen.config[0]?.credentials).toEqual({ accessKeyId: 'a', secretAccessKey: 's' });
  });

  it('refuses explicit credentials with an empty key', () => {
    const { deps } = fake();
    expect(() =>
      storage({ secrets }, { ...options, credentials: { accessKeyId: '', secretAccessKey: 's' } }, deps),
    ).toThrow(/credentials/);
  });

  it('fails at setup when a secret is missing, naming the secret only', () => {
    const { deps } = fake();
    expect(() => storage({ secrets: { S3_ACCESS_KEY_ID: 'AKIDVALUE' } }, options, deps)).toThrow(
      /S3_SECRET_ACCESS_KEY is not set/,
    );
  });

  it('fails at setup on bad options, before any client exists', () => {
    const { seen, deps } = fake();
    expect(() => storage({ secrets }, { ...options, bucket: 'Bad.Bucket' }, deps)).toThrow(/bucket/);
    expect(seen.config).toHaveLength(0);
  });
});

describe('put and putAndLink', () => {
  it('streams the file with its length and a unique derived key', async () => {
    const { seen, deps } = fake();
    const result = await storage({ secrets }, options, deps).put(file);
    expect(result).toEqual({ key: 'run-1/report.csv', size: 8 });
    expect(seen.puts[0]).toMatchObject({ Bucket: 'acme-reports', Key: 'run-1/report.csv', ContentLength: 8 });
    expect(seen.puts[0]?.Body).toBeInstanceOf(Readable);
    expect(seen.bodies[0]).toBe('a,b\n1,2\n');
  });

  it('returns a presigned link for the uploaded key with the asked expiry', async () => {
    const { deps } = fake();
    const url = await storage({ secrets }, options, deps).putAndLink(file, { key: 'out/r.csv', expiresSec: 86400 });
    expect(url).toBe('https://signed/out/r.csv?X-Amz-Expires=86400');
  });

  it('refuses a bad expiry before uploading anything', async () => {
    const { seen, deps } = fake();
    await expect(storage({ secrets }, options, deps).putAndLink(file, { expiresSec: 604801 })).rejects.toThrow(
      /7 days/,
    );
    expect(seen.puts).toHaveLength(0);
  });

  it('refuses a directory', async () => {
    const { deps } = fake();
    await expect(storage({ secrets }, options, deps).put(dir)).rejects.toThrow(/not a regular file/);
  });

  it('keeps both secret values out of an SDK error', async () => {
    const failing = async () => {
      const error = Object.assign(new Error('denied for AKIDVALUE signed with SECRETVALUE'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      });
      throw error;
    };
    const { deps } = fake({ put: failing });
    const failure = await storage({ secrets }, options, deps)
      .put(file)
      .catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    const message = (failure as Error).message;
    expect(message).toContain('AccessDenied (HTTP 403)');
    expect(message).not.toContain('AKIDVALUE');
    expect(message).not.toContain('SECRETVALUE');
    expect((failure as Error).cause).toBeUndefined();
  });
});

describe('get', () => {
  it('streams the object body to the file', async () => {
    const { deps } = fake();
    const target = join(dir, 'in.bin');
    await storage({ secrets }, options, deps).get('some/key', target);
    expect(await readFile(target, 'utf8')).toBe('downloaded');
  });

  it('fails clearly when the body is not a stream', async () => {
    const { deps } = fake({ get: async () => undefined });
    await expect(storage({ secrets }, options, deps).get('k', join(dir, 'x'))).rejects.toThrow(/no readable body/);
  });
});
