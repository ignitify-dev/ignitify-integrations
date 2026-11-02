// The fixed vocabulary of the store. A change here is a code change (review + tests), never config.
// Every enum in the manifest JSON Schema is built from these arrays (schema.ts), so the schema and
// the types cannot disagree.

export const SCHEMA_VERSION = 1;

export const MANIFEST_FILE = 'integration.yaml';
export const PACKAGE_SCOPE = '@ignitify-integrations';

export const RUNTIMES = ['node'] as const;

/** Ordered: a later type includes the rights of an earlier one. */
export const NETWORK_TYPES = ['none', 'egress', 'bidirectional'] as const;

/** Ordered by size. The platform's preset catalogue; `min_preset` must name one. */
export const PRESETS = ['std.micro', 'std.small', 'std.medium', 'std.large', 'std.xlarge'] as const;

export const DURATIONS = ['short', 'long'] as const;
export const INTERACTIONS = ['boundary-only', 'continuous'] as const;

/** An integration name: also its folder (`integrations/<name>`) and its npm name (`@ignitify-integrations/<name>`). */
export const NAME_PATTERN = '^[a-z][a-z0-9-]*[a-z0-9]$';

/**
 * The platform's per-run callback route (`/__callback/<token>`). A task route at or under it would
 * shadow the callback, so a manifest may not claim one.
 */
export const CALLBACK_ROUTE_PREFIX = '/__callback/';

/**
 * Most hosts one task may list in `execution.network.egress_allow`. Mirrors the platform limit
 * (a longer list is refused at deploy); kept here so `integration:add` refuses it first.
 */
export const EGRESS_ALLOW_MAX = 32;
/** `network.egress_hint` is one short line the plan prints, not documentation. */
export const EGRESS_HINT_MAX_LENGTH = 200;
/** One line: no line break, so the hint prints as one "you add" line. */
export const EGRESS_HINT_PATTERN = '^[^\\r\\n]*$';

/** One DNS label: 1-63 of a-z, 0-9 and "-", never starting or ending with "-". */
const DNS_LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
/**
 * An egress host: at least two labels, lower case (hosts are compared as strings), and NO
 * wildcard: `--yes` applies a plan with no person reading it, so a package must never be able
 * to ask for a whole domain.
 */
export const HOST_PATTERN = new RegExp(`^${DNS_LABEL}(?:\\.${DNS_LABEL})+$`);
export const HOST_MAX_LENGTH = 253;
