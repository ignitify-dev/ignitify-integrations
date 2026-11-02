// Repo-level guard: planAdd and checkCoverage compare the same needs in two places. For every real
// manifest and several starting task configs, adding is idempotent and leaves nothing uncovered.

import { describe, expect, it } from 'vitest';
import { checkCoverage, parseManifest, planAdd, type Manifest, type TaskConfig } from '@ignitify-integrations/core';
import { unwrap } from '@ignitify-integrations/runtime';
import { readItems } from '../src/items.js';

const items = await readItems();
const manifests: Manifest[] = items.map((item) => unwrap(parseManifest(item.manifestText ?? '')));

const STARTS: Record<string, TaskConfig> = {
  'an empty task': {},
  'a task with a network and no host list (any host)': { execution: { network: { type: 'egress' } } },
  'a task with an unknown preset': { run: { preset: 'custom.huge' } },
  'a task with its own secrets and packages': { secrets: ['OWN_TOKEN'], build: { system_packages: ['imagemagick'] } },
};

describe('every integration manifest', () => {
  it('is in the repo', () => {
    expect(manifests.length).toBe(items.length);
    expect(manifests.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(STARTS))('added to %s: idempotent and fully covered', (_, start) => {
    for (const manifest of manifests) {
      const once = unwrap(planAdd(start, manifest));
      const twice = unwrap(planAdd(once.config, manifest));
      expect(twice.config, manifest.name).toEqual(once.config);
      expect(checkCoverage(once.config, [manifest]), manifest.name).toEqual([]);
    }
  });
});
