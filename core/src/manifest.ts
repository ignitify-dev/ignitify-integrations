// integration.yaml text -> a checked Manifest: YAML, then the JSON Schema, then the rules a
// schema cannot express (they relate one field to another).

import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';
import { parse } from 'yaml';
import { err, ok, type Result } from '@ignitify-integrations/runtime';
import { CALLBACK_ROUTE_PREFIX, HOST_MAX_LENGTH, HOST_PATTERN } from './constants.js';
import { MANIFEST_MESSAGES } from './messages.js';
import { MANIFEST_SCHEMA } from './schema.js';
import type { Manifest } from './types.js';

const INBOUND_KEYS = ['inbound_port', 'inbound_routes', 'inbound_max_concurrent'] as const;
const EGRESS_KEYS = ['egress_allow', 'egress_hint'] as const;
const ROOT_PATH = '(root)';
// An all-digit last label makes an IP address, not a host name; egress rules are per host.
const NUMERIC_LABEL = /^\d+$/;

// Compiled once: compiling per call would rebuild the validator for every manifest.
const validate = new Ajv2020({ allErrors: true, strict: true }).compile<Manifest>(MANIFEST_SCHEMA);

export const isHostName = (host: string): boolean =>
  host.length <= HOST_MAX_LENGTH &&
  HOST_PATTERN.test(host) &&
  !NUMERIC_LABEL.test(host.slice(host.lastIndexOf('.') + 1));

const loadYaml = (text: string): Result<unknown> => {
  try {
    // YAML 1.2 core schema: no timestamps or other implicit types, so every scalar stays what it looks like.
    return ok(parse(text, { schema: 'core', uniqueKeys: true }));
  } catch (error) {
    return err(MANIFEST_MESSAGES.yaml(error instanceof Error ? error.message : String(error)));
  }
};

const formatError = (error: ErrorObject): string => {
  const path = error.instancePath === '' ? ROOT_PATH : error.instancePath.slice(1).replaceAll('/', '.');
  const params = error.params as { additionalProperty?: string; allowedValues?: readonly unknown[] };
  const detail =
    params.additionalProperty !== undefined
      ? ` "${params.additionalProperty}"`
      : params.allowedValues !== undefined
        ? `: ${params.allowedValues.join(', ')}`
        : '';
  return MANIFEST_MESSAGES.schema(path, `${error.message ?? ''}${detail}`);
};

const semanticIssues = (manifest: Manifest): string[] => {
  const network = manifest.network;
  const type = network?.type ?? 'none';
  return [
    ...(network?.egress_allow ?? []).filter((host) => !isHostName(host)).map(MANIFEST_MESSAGES.badHost),
    ...(type === 'none'
      ? EGRESS_KEYS.filter((key) => network?.[key] !== undefined).map(MANIFEST_MESSAGES.egressNeedsNic)
      : []),
    ...(type === 'bidirectional'
      ? []
      : INBOUND_KEYS.filter((key) => network?.[key] !== undefined).map(MANIFEST_MESSAGES.inboundNeedsBidirectional)),
    ...(network?.inbound_routes ?? [])
      .filter((route) => route.prefix.startsWith(CALLBACK_ROUTE_PREFIX))
      .map((route) => MANIFEST_MESSAGES.shadowsCallback(route.prefix)),
  ];
};

export const parseManifest = (text: string): Result<Manifest, string[]> => {
  const loaded = loadYaml(text);
  if (!loaded.ok) return err([loaded.error]);
  const data = loaded.value;
  if (!validate(data)) return err((validate.errors ?? []).map(formatError));
  const issues = semanticIssues(data);
  return issues.length > 0 ? err(issues) : ok(data);
};
