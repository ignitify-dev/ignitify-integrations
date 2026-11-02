// Pure decisions of s3-storage: options, keys, expiry, client config, redaction. No I/O here.

import { basename } from 'node:path';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { err, ok, type Result } from '@ignitify-integrations/runtime';
import {
  BUCKET_PATTERN,
  EXPIRES_DEFAULT_SEC,
  EXPIRES_MAX_SEC,
  EXPIRES_MIN_SEC,
  HTTP,
  HTTPS,
  KEY_FALLBACK_NAME,
  KEY_MAX_BYTES,
  KEY_UNSAFE_CHARS,
  KEY_UNSAFE_REPLACEMENT,
  MESSAGES,
  PUT_MAX_BYTES,
  REDACTED,
  REGION_PATTERN,
} from './constants.js';

export interface StorageOptions {
  readonly bucket: string;
  readonly region: string;
  /** Origin of a non-AWS provider (R2, MinIO, B2). Switches to path-style addressing. */
  readonly endpoint?: string;
  /**
   * Keys of a second account. Default: the secrets `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`
   * from ctx.secrets. Pass this to read other secrets, e.g. `ctx.secrets.BACKUP_S3_ACCESS_KEY_ID`.
   */
  readonly credentials?: Credentials;
  /** Accept an `http:` endpoint. For a local test server only: data and signatures go in clear. */
  readonly insecureHttp?: boolean;
}

export interface StorageConfig {
  readonly bucket: string;
  readonly region: string;
  /** Normalised origin, e.g. `https://acc.r2.cloudflarestorage.com`; absent for AWS. */
  readonly endpoint?: string;
}

export interface Credentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

const parseEndpoint = (endpoint: string, insecureHttp: boolean): Result<string> => {
  if (!URL.canParse(endpoint)) return err(MESSAGES.badEndpoint(endpoint));
  const url = new URL(endpoint);
  const allowed = url.protocol === HTTPS || (insecureHttp && url.protocol === HTTP);
  if (!allowed) return err(MESSAGES.endpointNotHttps(endpoint));
  const originOnly = url.pathname === '/' && url.search === '' && url.username === '' && url.password === '';
  return originOnly ? ok(url.origin) : err(MESSAGES.endpointHasPath(endpoint));
};

export const parseOptions = (options: StorageOptions): Result<StorageConfig> => {
  if (!BUCKET_PATTERN.test(options.bucket)) return err(MESSAGES.badBucket(options.bucket));
  if (!REGION_PATTERN.test(options.region)) return err(MESSAGES.badRegion(options.region));
  if (options.endpoint === undefined) return ok({ bucket: options.bucket, region: options.region });
  const endpoint = parseEndpoint(options.endpoint, options.insecureHttp === true);
  return endpoint.ok ? ok({ bucket: options.bucket, region: options.region, endpoint: endpoint.value }) : endpoint;
};

export const resolveExpiry = (expiresSec: number = EXPIRES_DEFAULT_SEC): Result<number> =>
  Number.isInteger(expiresSec) && expiresSec >= EXPIRES_MIN_SEC && expiresSec <= EXPIRES_MAX_SEC
    ? ok(expiresSec)
    : err(MESSAGES.badExpiry(expiresSec));

export const validateKey = (key: string): Result<string> => {
  const bytes = Buffer.byteLength(key, 'utf8');
  return bytes > 0 && bytes <= KEY_MAX_BYTES && !key.startsWith('/') ? ok(key) : err(MESSAGES.badKey(key));
};

/**
 * `<id>/<file name>`. The unique prefix matters: without it, a second run that uploads
 * `report.pdf` would overwrite the first, and the first run's link would serve the new data.
 */
export const deriveKey = (filePath: string, id: string): string => {
  const name = basename(filePath).replace(KEY_UNSAFE_CHARS, KEY_UNSAFE_REPLACEMENT);
  return `${id}/${name === '' ? KEY_FALLBACK_NAME : name}`;
};

/** The key to use: the caller's (checked) or a derived one. */
export const resolveKey = (filePath: string, key: string | undefined, id: string): Result<string> =>
  key === undefined ? ok(deriveKey(filePath, id)) : validateKey(key);

export const checkSize = (filePath: string, size: number): Result<number> =>
  size <= PUT_MAX_BYTES ? ok(size) : err(MESSAGES.tooLarge(filePath, size));

export const clientConfig = (config: StorageConfig, credentials: Credentials): S3ClientConfig =>
  config.endpoint === undefined
    ? { region: config.region, credentials }
    : {
        region: config.region,
        credentials,
        endpoint: config.endpoint,
        forcePathStyle: true,
        // The SDK's default checksums (CRC32 trailers) are not accepted by every S3-compatible
        // provider; send a checksum only where the operation requires one.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      };

/** Explicit credentials must both be set: an empty key would fail later with a less clear error. */
export const checkCredentials = (credentials: Credentials): Result<Credentials> =>
  typeof credentials.accessKeyId === 'string' &&
  credentials.accessKeyId !== '' &&
  typeof credentials.secretAccessKey === 'string' &&
  credentials.secretAccessKey !== ''
    ? ok(credentials)
    : err(MESSAGES.emptyCredentials);

/** Remove every secret value from a text that may reach an error or a log. */
export const redact = (text: string, secrets: readonly string[]): string =>
  secrets.filter((secret) => secret !== '').reduce((out, secret) => out.replaceAll(secret, REDACTED), text);
