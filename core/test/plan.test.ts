import { describe, expect, it } from 'vitest';
import {
  checkCoverage,
  hasCode,
  EGRESS_ALLOW_MAX,
  planAdd,
  planHeadline,
  type Manifest,
  type PlanOutcome,
  type TaskConfig,
} from '@ignitify-integrations/core';
import { unwrap, type Result } from '@ignitify-integrations/runtime';

const base = { schema_version: 1, runtimes: ['node'] } as const;

const TELEGRAM: Manifest = {
  ...base,
  name: 'telegram',
  secrets: ['TELEGRAM_BOT_TOKEN'],
  network: { type: 'egress', egress_allow: ['api.telegram.org'] },
};

const S3: Manifest = {
  ...base,
  name: 's3-storage',
  secrets: ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'],
  network: { type: 'egress', egress_hint: 'your bucket host' },
};

const STREAM: Manifest = {
  ...base,
  name: 'stream',
  network: {
    type: 'bidirectional',
    egress_hint: 'the source host',
    inbound_port: 8080,
    inbound_routes: [{ prefix: '/live/' }],
    inbound_max_concurrent: 16,
  },
  execution: { duration: 'long', interaction: 'continuous' },
  system_packages: ['ffmpeg'],
  min_preset: 'std.medium',
};

const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const value = (result: Result<PlanOutcome, string[]>): PlanOutcome => {
  if (!result.ok) throw new Error(result.error.join('\n'));
  return result.value;
};
const errors = (result: Result<PlanOutcome, string[]>): string[] => (result.ok ? [] : result.error);

describe('planHeadline', () => {
  it('names the package and version, then what it brings', () => {
    expect(planHeadline(TELEGRAM, '0.1.0', false)).toBe('@ignitify-integrations/telegram@0.1.0 · settings only');
    expect(planHeadline(S3, '0.1.0', true)).toBe('@ignitify-integrations/s3-storage@0.1.0 · settings + code');
    expect(planHeadline(STREAM, '0.2.0', true)).toBe(
      '@ignitify-integrations/stream@0.2.0 · settings + code · runs ffmpeg',
    );
  });
});

describe('planAdd', () => {
  it('gives a task with no network exactly the fixed hosts (fail-closed), and the secret', () => {
    const out = value(planAdd(deepFreeze({ runtime: 'node' }), TELEGRAM));
    expect(out.config).toEqual({
      runtime: 'node',
      secrets: ['TELEGRAM_BOT_TOKEN'],
      execution: { network: { type: 'egress', egress_allow: ['api.telegram.org'] } },
    });
    expect(out.notes).toEqual(['execution.network.type: none -> egress']);
    expect(out.youAdd).toEqual(['secret TELEGRAM_BOT_TOKEN (new): ignitify secret:set TELEGRAM_BOT_TOKEN --stdin']);
  });

  it('opens an empty host list for a varying host, and prints the hint under "you add"', () => {
    const out = value(planAdd({}, S3));
    expect(out.config.execution?.network).toEqual({ type: 'egress', egress_allow: [] });
    expect(out.youAdd).toContain('egress host: your bucket host');
  });

  it('takes the union of secrets, hosts and system packages, keeping the tenant entries first', () => {
    const config: TaskConfig = deepFreeze({
      secrets: ['MINE'],
      execution: { network: { type: 'egress', egress_allow: ['my.example.com'] } },
      build: { system_packages: ['git'] },
    });
    const out = value(planAdd(config, TELEGRAM));
    expect(out.config.secrets).toEqual(['MINE', 'TELEGRAM_BOT_TOKEN']);
    expect(out.config.execution?.network?.egress_allow).toEqual(['my.example.com', 'api.telegram.org']);
    expect(value(planAdd(config, STREAM)).config.build?.system_packages).toEqual(['git', 'ffmpeg']);
  });

  it('leaves an absent egress_allow absent on a NIC (any host), with a note', () => {
    const out = value(planAdd({ execution: { network: { type: 'egress' } } }, TELEGRAM));
    expect(out.config.execution?.network).toEqual({ type: 'egress' });
    expect(out.notes[0]).toMatch(/stays absent/);
  });

  it('raises network type and preset, never lowers them', () => {
    const small = value(planAdd({ run: { preset: 'std.micro' } }, STREAM));
    expect(small.config.execution?.network?.type).toBe('bidirectional');
    expect(small.config.run?.preset).toBe('std.medium');
    const big = value(
      planAdd({ execution: { network: { type: 'bidirectional' } }, run: { preset: 'std.large' } }, TELEGRAM),
    );
    expect(big.config.execution?.network?.type).toBe('bidirectional');
    expect(value(planAdd({ run: { preset: 'std.large' } }, STREAM)).config.run?.preset).toBe('std.large');
  });

  it('leaves an unknown preset alone, with a note', () => {
    const out = value(planAdd({ run: { preset: 'gpu.huge' } }, STREAM));
    expect(out.config.run?.preset).toBe('gpu.huge');
    expect(out.notes.some((note) => note.includes('not a known preset'))).toBe(true);
  });

  it('writes the execution and inbound fields the task does not set', () => {
    const network = value(planAdd({}, STREAM)).config.execution;
    expect(network).toMatchObject({
      duration: 'long',
      interaction: 'continuous',
      network: { inbound_port: 8080, inbound_max_concurrent: 16, inbound_routes: [{ prefix: '/live/' }] },
    });
  });

  it('refuses every field the task sets to a different value, naming each field', () => {
    const config: TaskConfig = {
      execution: { duration: 'short', network: { type: 'bidirectional', inbound_port: 9000 } },
    };
    const refused = errors(planAdd(config, STREAM));
    expect(refused).toHaveLength(2);
    expect(refused[0]).toMatch(/^execution\.duration is short but @ignitify-integrations\/stream needs long/);
    expect(refused[1]).toMatch(/^execution\.network\.inbound_port is 9000/);
  });

  it(`refuses a union of more than ${EGRESS_ALLOW_MAX} hosts`, () => {
    const hosts = Array.from({ length: EGRESS_ALLOW_MAX }, (_, i) => `h${i}.example.com`);
    const refused = errors(planAdd({ execution: { network: { type: 'egress', egress_allow: hosts } } }, TELEGRAM));
    expect(refused).toEqual([expect.stringContaining(`at most ${EGRESS_ALLOW_MAX}`)]);
  });

  it('is idempotent: adding twice gives the same config, and the result covers the manifest', () => {
    const once = value(planAdd({}, STREAM)).config;
    expect(value(planAdd(once, STREAM)).config).toEqual(once);
    expect(checkCoverage(once, [STREAM])).toEqual([]);
  });

  it('keeps keys it does not own', () => {
    const out = value(planAdd(deepFreeze({ slug: 'x', execution: { cpu: 2 }, run: { timeout_sec: 5 } }), STREAM));
    expect(out.config).toMatchObject({ slug: 'x', execution: { cpu: 2 }, run: { timeout_sec: 5 } });
  });
});

describe('exact-path inbound routes ({ path })', () => {
  it('planAdd keeps a path route and adds the prefix route next to it', () => {
    const config: TaskConfig = { execution: { network: { inbound_routes: [{ path: '/health' }] } } };
    expect(value(planAdd(config, STREAM)).config.execution?.network?.inbound_routes).toEqual([
      { path: '/health' },
      { prefix: '/live/' },
    ]);
  });

  it('a path route never covers a prefix route', () => {
    const config: TaskConfig = { execution: { network: { inbound_routes: [{ path: '/live/' }] } } };
    expect(checkCoverage(config, [STREAM])).toContain(
      '@ignitify-integrations/stream: route /live/ is missing from execution.network.inbound_routes',
    );
  });
});

describe('you add: secret lines', () => {
  it('marks only the secrets the task does not declare yet', () => {
    const s3 = unwrap(planAdd({ secrets: ['S3_ACCESS_KEY_ID'] }, S3));
    const secretLines = s3.youAdd.filter((line) => line.startsWith('secret '));
    expect(secretLines).toEqual([
      'secret S3_ACCESS_KEY_ID: ignitify secret:set S3_ACCESS_KEY_ID --stdin',
      'secret S3_SECRET_ACCESS_KEY (new): ignitify secret:set S3_SECRET_ACCESS_KEY --stdin',
    ]);
  });
});

describe('hasCode', () => {
  it('is true only when the published package.json has an exports entry', () => {
    expect(hasCode({ exports: { '.': './dist/index.js' } })).toBe(true);
    expect(hasCode({ main: './index.js' })).toBe(false);
    expect(hasCode({})).toBe(false);
    expect(hasCode(null)).toBe(false);
  });
});

describe('checkCoverage', () => {
  it('reports every way task.yaml no longer covers an installed integration', () => {
    const covered = value(planAdd(value(planAdd({}, STREAM)).config, TELEGRAM)).config;
    const broken: TaskConfig = {
      ...covered,
      secrets: [],
      execution: { ...covered.execution, duration: 'short', network: { type: 'egress', egress_allow: [] } },
      build: {},
      run: {},
    };
    const issues = checkCoverage(broken, [STREAM, TELEGRAM]);
    expect(issues).toEqual([
      '@ignitify-integrations/stream: execution.network.type is egress, needs bidirectional',
      '@ignitify-integrations/stream: execution.duration is short, needs long',
      '@ignitify-integrations/stream: execution.network.inbound_port is (absent), needs 8080',
      '@ignitify-integrations/stream: execution.network.inbound_max_concurrent is (absent), needs 16',
      '@ignitify-integrations/stream: route /live/ is missing from execution.network.inbound_routes',
      '@ignitify-integrations/stream: system package ffmpeg is missing from build.system_packages',
      '@ignitify-integrations/stream: run.preset is (default), needs at least std.medium',
      '@ignitify-integrations/telegram: secret TELEGRAM_BOT_TOKEN is missing from secrets',
      '@ignitify-integrations/telegram: host api.telegram.org is missing from execution.network.egress_allow',
    ]);
  });

  it('is empty with no installed integrations', () => {
    expect(checkCoverage({}, [])).toEqual([]);
  });
});
