import { describe, expect, it } from 'vitest';
import { EGRESS_ALLOW_MAX, parseManifest } from '@ignitify-integrations/core';

const BASE = `schema_version: 1
name: s3-storage
runtimes: [node]
`;

const errorsOf = (text: string): string[] => {
  const result = parseManifest(text);
  return result.ok ? [] : result.error;
};

describe('parseManifest', () => {
  it('accepts a manifest with secrets, a fixed host list and a hint', () => {
    const result = parseManifest(`${BASE}secrets: [S3_ACCESS_KEY_ID]
network: { type: egress, egress_allow: [api.example.com], egress_hint: 'your bucket host' }
system_packages: [ffmpeg]
`);
    expect(result.ok && result.value.network?.egress_hint).toBe('your bucket host');
  });

  it('reports bad YAML as one clear error, and a duplicate key as bad YAML', () => {
    expect(errorsOf('name: [unclosed')).toEqual([expect.stringMatching(/^not valid YAML/)]);
    expect(errorsOf(`${BASE}name: other\n`)[0]).toMatch(/^not valid YAML/);
  });

  it('prefixes schema errors with the field path and names the bad key or the allowed values', () => {
    const errors = errorsOf(`${BASE}kind: package\nnetwork: { type: wifi }\n`);
    expect(errors).toContain('(root): must NOT have additional properties "kind"');
    expect(errors).toContain('network.type: must be equal to one of the allowed values: none, egress, bidirectional');
  });

  it('refuses a secret name that breaks the runtime rule (upper snake case)', () => {
    expect(errorsOf(`${BASE}secrets: [lower_case]\n`)[0]).toMatch(/^secrets\.0:/);
  });

  it('refuses a host that is a template, an IP, a whole TLD or any wildcard, and points to egress_hint', () => {
    const errors = errorsOf(
      `${BASE}network: { type: egress, egress_allow: ['{bucket}.example.com', 10.0.0.1, '*.com', '*.example.com'] }\n`,
    );
    expect(errors).toHaveLength(4);
    expect(errors[3]).toContain('no wildcard');
    expect(errors[0]).toContain('network.egress_hint');
  });

  it(`refuses more than ${EGRESS_ALLOW_MAX} fixed hosts`, () => {
    const hosts = Array.from({ length: EGRESS_ALLOW_MAX + 1 }, (_, i) => `h${i}.example.com`).join(', ');
    expect(errorsOf(`${BASE}network: { type: egress, egress_allow: [${hosts}] }\n`)[0]).toMatch(
      /^network\.egress_allow:/,
    );
  });

  it('refuses an egress hint with a line break: it is one line under "you add"', () => {
    expect(errorsOf(`${BASE}network: { type: egress, egress_hint: "one\\ntwo" }\n`)).toEqual([
      expect.stringMatching(/^network\.egress_hint: must match pattern/),
    ]);
  });

  it('refuses egress fields without a NIC and inbound fields without bidirectional', () => {
    expect(errorsOf(`${BASE}network: { type: none, egress_hint: x }\n`)).toEqual([
      'network.egress_hint: needs network.type "egress" or "bidirectional"',
    ]);
    expect(errorsOf(`${BASE}network: { type: egress, inbound_port: 8080 }\n`)).toEqual([
      'network.inbound_port: needs network.type "bidirectional"',
    ]);
  });

  it('refuses an inbound route that would shadow the platform callback route', () => {
    expect(errorsOf(`${BASE}network: { type: bidirectional, inbound_routes: [{ prefix: /__callback/x/ }] }\n`)).toEqual(
      ['network.inbound_routes: "/__callback/x/" would shadow the platform callback route /__callback/'],
    );
    expect(errorsOf(`${BASE}network: { type: bidirectional, inbound_routes: [{ prefix: /live/ }] }\n`)).toEqual([]);
  });
});
