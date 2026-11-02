// The manifest writes inbound_port and the route into task.yaml; the code serves on its defaults.
// They must be the same values, or a task with default options listens where nothing is routed.

import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { parseManifest } from '@ignitify-integrations/core';
import { unwrap } from '@ignitify-integrations/runtime';
import { DEFAULT_PORT, DEFAULT_ROUTE } from '../src/constants.js';

it('the manifest port and route equal the code defaults', async () => {
  const manifest = unwrap(parseManifest(await readFile(new URL('../integration.yaml', import.meta.url), 'utf8')));
  expect(manifest.network?.inbound_port).toBe(DEFAULT_PORT);
  expect(manifest.network?.inbound_routes?.map((route) => route.prefix)).toEqual([DEFAULT_ROUTE]);
});
