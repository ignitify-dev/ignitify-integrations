// Pure request encoding: JSON when no file is attached, else multipart parts. A file at the top
// level is its own part; a file nested in `media` (an album, an edited media) is sent as
// `attach://<name>` with the file in a part of that name, as the Bot API asks. So is a top-level
// `thumbnail` or `cover`.

import { ATTACH_NAME_PREFIX, ATTACH_ONLY_FIELDS, ATTACH_PREFIX, DISK_FILE_KIND } from './constants.js';
import type { DiskFile } from './types.js';

export type Encoded =
  | { readonly kind: 'json'; readonly body: string }
  | {
      readonly kind: 'multipart';
      readonly fields: readonly (readonly [string, string])[];
      readonly files: readonly (readonly [string, DiskFile])[];
    };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isDiskFile = (value: unknown): value is DiskFile =>
  isRecord(value) &&
  value['kind'] === DISK_FILE_KIND &&
  typeof value['path'] === 'string' &&
  typeof value['filename'] === 'string';

const hasDiskFile = (value: unknown): boolean =>
  isDiskFile(value) ||
  (Array.isArray(value) && value.some(hasDiskFile)) ||
  (isRecord(value) && Object.values(value).some(hasDiskFile));

const defined = (record: Readonly<Record<string, unknown>>): (readonly [string, unknown])[] =>
  Object.entries(record).filter(([, value]) => value !== undefined);

export const encodeParams = (params: Readonly<Record<string, unknown>>): Encoded => {
  if (!hasDiskFile(params)) return { kind: 'json', body: JSON.stringify(params) };
  const files: (readonly [string, DiskFile])[] = [];
  // Put each nested file in its own part, and leave its `attach://` name in its place.
  const attach = (value: unknown): unknown => {
    if (isDiskFile(value)) {
      const name = `${ATTACH_NAME_PREFIX}${files.length}`;
      files.push([name, value]);
      return `${ATTACH_PREFIX}${name}`;
    }
    if (Array.isArray(value)) return value.map(attach);
    return isRecord(value) ? Object.fromEntries(defined(value).map(([key, inner]) => [key, attach(inner)])) : value;
  };
  const fields = defined(params).flatMap(([key, value]): (readonly [string, string])[] => {
    if (isDiskFile(value) && !ATTACH_ONLY_FIELDS.includes(key)) {
      files.push([key, value]);
      return [];
    }
    const encoded = attach(value);
    return [[key, typeof encoded === 'string' ? encoded : JSON.stringify(encoded)]];
  });
  return { kind: 'multipart', fields, files };
};
