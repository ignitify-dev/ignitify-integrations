// JSON Schema (draft 2020-12) of integration.yaml, built from the constants so there is one
// source for every enum and pattern.
// machine-readable: integrations.schema.manifest.v1

import {
  INBOUND_PORT_MAX,
  INBOUND_PORT_MIN,
  ROUTE_PREFIX_PATTERN,
  SECRET_NAME_MAX_LENGTH,
  SECRET_NAME_PATTERN,
} from '@ignitify-integrations/runtime';
import {
  DURATIONS,
  EGRESS_ALLOW_MAX,
  EGRESS_HINT_MAX_LENGTH,
  EGRESS_HINT_PATTERN,
  HOST_MAX_LENGTH,
  INBOUND_ROUTE_MAX_LENGTH,
  INBOUND_ROUTES_MAX,
  INTERACTIONS,
  NAME_PATTERN,
  NETWORK_TYPES,
  PRESETS,
  RUNTIMES,
  SCHEMA_VERSION,
} from './constants.js';

const nonEmptyString = { type: 'string', minLength: 1 } as const;
const uniqueStrings = { type: 'array', items: nonEmptyString, uniqueItems: true } as const;
const closed = <T extends object>(properties: T, required: readonly string[] = []) =>
  ({ type: 'object', additionalProperties: false, properties, required }) as const;

const network = closed(
  {
    type: { enum: NETWORK_TYPES },
    // The host grammar is checked in manifest.ts (isHostName): a regex alone cannot refuse an IP.
    egress_allow: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: HOST_MAX_LENGTH },
      uniqueItems: true,
      maxItems: EGRESS_ALLOW_MAX,
    },
    egress_hint: {
      type: 'string',
      minLength: 1,
      maxLength: EGRESS_HINT_MAX_LENGTH,
      pattern: EGRESS_HINT_PATTERN,
    },
    inbound_port: { type: 'integer', minimum: INBOUND_PORT_MIN, maximum: INBOUND_PORT_MAX },
    inbound_routes: {
      type: 'array',
      minItems: 1,
      maxItems: INBOUND_ROUTES_MAX,
      items: closed(
        { prefix: { type: 'string', maxLength: INBOUND_ROUTE_MAX_LENGTH, pattern: ROUTE_PREFIX_PATTERN } },
        ['prefix'],
      ),
    },
    inbound_max_concurrent: { type: 'integer', minimum: 1 },
  },
  ['type'],
);

export const MANIFEST_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'ignitify integration manifest',
  ...closed(
    {
      schema_version: { const: SCHEMA_VERSION },
      name: { type: 'string', pattern: NAME_PATTERN },
      runtimes: { type: 'array', items: { enum: RUNTIMES }, minItems: 1, uniqueItems: true },
      secrets: {
        type: 'array',
        items: { type: 'string', maxLength: SECRET_NAME_MAX_LENGTH, pattern: SECRET_NAME_PATTERN.source },
        uniqueItems: true,
      },
      network,
      execution: closed({ duration: { enum: DURATIONS }, interaction: { enum: INTERACTIONS } }),
      system_packages: uniqueStrings,
      min_preset: { enum: PRESETS },
    },
    ['schema_version', 'name', 'runtimes'],
  ),
} as const;
