// Limits and messages of s3-storage. Limits are S3 protocol facts, not tuning knobs.

/** Default secret names, as the manifest declares them. A second account passes `credentials`. */
export const SECRET_ACCESS_KEY_ID = 'S3_ACCESS_KEY_ID';
export const SECRET_SECRET_ACCESS_KEY = 'S3_SECRET_ACCESS_KEY';

/** SigV4 presigned URLs are valid for at most 7 days. */
export const EXPIRES_MIN_SEC = 1;
export const EXPIRES_MAX_SEC = 7 * 24 * 60 * 60;
export const EXPIRES_DEFAULT_SEC = 60 * 60;

/** One PutObject carries at most 5 GiB; above that S3 needs a multipart upload. */
export const PUT_MAX_BYTES = 5 * 1024 ** 3;
export const KEY_MAX_BYTES = 1024;

/**
 * No dots: on AWS a dotted bucket falls back to path-style on `s3.<region>.amazonaws.com`, a host
 * the manifest does not allow. The rest is the common subset of AWS, R2, B2 and MinIO naming.
 */
export const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
export const REGION_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const HTTPS = 'https:';
export const HTTP = 'http:';
export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
/** File-name characters kept in a derived key; any other character becomes `_`. */
export const KEY_UNSAFE_CHARS = /[^A-Za-z0-9._-]/g;
export const KEY_UNSAFE_REPLACEMENT = '_';
export const KEY_FALLBACK_NAME = 'file';
export const REDACTED = '[redacted]';

export const MESSAGES = {
  badBucket: (bucket: string) => `bucket "${bucket}" must match ${BUCKET_PATTERN}`,
  badRegion: (region: string) => `region "${region}" must match ${REGION_PATTERN}`,
  badEndpoint: (endpoint: string) => `endpoint "${endpoint}" is not a URL`,
  endpointNotHttps: (endpoint: string) =>
    `endpoint "${endpoint}" must use https; set insecureHttp: true only for a local test server`,
  endpointHasPath: (endpoint: string) => `endpoint "${endpoint}" must be an origin only, without path, query or user`,
  badExpiry: (value: number) =>
    `expiresSec ${value} must be an integer from ${EXPIRES_MIN_SEC} to ${EXPIRES_MAX_SEC} (7 days, the S3 presign limit)`,
  badKey: (key: string) => `key "${key}" must be 1 to ${KEY_MAX_BYTES} bytes and must not start with "/"`,
  tooLarge: (filePath: string, size: number) =>
    `file ${filePath} is ${size} bytes; one upload takes at most ${PUT_MAX_BYTES} bytes (5 GiB)`,
  emptyCredentials: 'credentials: accessKeyId and secretAccessKey must both be non-empty strings',
  notAFile: (filePath: string) => `${filePath} is not a regular file`,
  noBody: (key: string) => `s3 get of "${key}" returned no readable body`,
  failed: (operation: string, key: string, detail: string) => `s3 ${operation} of "${key}" failed: ${detail}`,
} as const;
