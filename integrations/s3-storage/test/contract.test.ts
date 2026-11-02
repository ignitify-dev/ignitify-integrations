// Contract test against a real S3-compatible server (MinIO in CI). Runs only when the
// S3_TEST_* variables are set. The bucket is created if it is missing, so CI needs no setup step.

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { beforeAll, describe, expect, it } from 'vitest';
import { storage } from '../src/index.js';

const env = {
  endpoint: process.env.S3_TEST_ENDPOINT,
  accessKey: process.env.S3_TEST_ACCESS_KEY,
  secretKey: process.env.S3_TEST_SECRET_KEY,
  bucket: process.env.S3_TEST_BUCKET,
};
const configured = Object.values(env).every((value) => value !== undefined && value !== '');

// Both mean the bucket is there and ours: a fresh MinIO, or a sandbox bucket made by hand.
const BUCKET_READY = new Set(['BucketAlreadyOwnedByYou', 'BucketAlreadyExists']);

describe.skipIf(!configured)('s3-storage against a real S3-compatible server', () => {
  beforeAll(async () => {
    const client = new S3Client({
      region: process.env.S3_TEST_REGION ?? 'us-east-1',
      endpoint: env.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: env.accessKey ?? '', secretAccessKey: env.secretKey ?? '' },
    });
    await client.send(new CreateBucketCommand({ Bucket: env.bucket })).catch((error: unknown) => {
      if (!(error instanceof Error && BUCKET_READY.has(error.name))) throw error;
    });
  });

  const open = () =>
    storage(
      { secrets: { S3_ACCESS_KEY_ID: env.accessKey ?? '', S3_SECRET_ACCESS_KEY: env.secretKey ?? '' } },
      {
        bucket: env.bucket ?? '',
        region: process.env.S3_TEST_REGION ?? 'us-east-1',
        endpoint: env.endpoint,
        // A local test server speaks plain http; production endpoints never take this flag.
        insecureHttp: env.endpoint?.startsWith('http:') === true,
      },
    );

  it('put → presign → fetch the link returns the same bytes; get returns them too', async () => {
    const dir = await mkdtemp(join(tmpdir(), 's3-contract-'));
    try {
      const bytes = randomBytes(256 * 1024);
      const file = join(dir, 'payload.bin');
      await writeFile(file, bytes);

      const store = open();
      const url = await store.putAndLink(file, { expiresSec: 300 });
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);

      const { key } = await store.put(file, { key: 'contract/fixed.bin' });
      const back = join(dir, 'back.bin');
      await store.get(key, back);
      expect((await readFile(back)).equals(bytes)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
