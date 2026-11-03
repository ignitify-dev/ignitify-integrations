// The manifest allows one host and one secret; the code uses them. They must be the same values.

import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { parseManifest } from '@ignitify-integrations/core';
import { unwrap } from '@ignitify-integrations/runtime';
import { API_HOST, SECRET_BOT_TOKEN } from '../src/constants.js';

it('the manifest host and secret equal the code defaults', async () => {
  const manifest = unwrap(parseManifest(await readFile(new URL('../integration.yaml', import.meta.url), 'utf8')));
  expect(manifest.network?.type).toBe('egress');
  expect(manifest.network?.egress_allow).toEqual([API_HOST]);
  expect(manifest.secrets).toEqual([SECRET_BOT_TOKEN]);
});
