// Facts about the ignitify platform that both run-time code (integrations) and the manifest schema (core)
// must agree on. One home, so integration code and the CLI can never accept different values.

/** An inbound route prefix the platform's edge accepts: starts and ends with "/", and is not "/" itself. */
export const ROUTE_PREFIX_PATTERN = '^/[a-z0-9._~-]+(/[a-z0-9._~-]+)*/$';

/** The port range a task may listen on for inbound requests. */
export const INBOUND_PORT_MIN = 1024;
export const INBOUND_PORT_MAX = 65535;
