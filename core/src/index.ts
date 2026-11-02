// The public API of @ignitify-integrations/core. Every name here is a semver promise; the rest of
// core is internal. The platform facts a client must test against its own copies are exported too:
// EGRESS_ALLOW_MAX, INBOUND_ROUTES_MAX, INBOUND_ROUTE_MAX_LENGTH, PRESETS, CALLBACK_ROUTE_PREFIX (the others live in @ignitify-integrations/runtime).

export {
  CALLBACK_ROUTE_PREFIX,
  EGRESS_ALLOW_MAX,
  INBOUND_ROUTE_MAX_LENGTH,
  INBOUND_ROUTES_MAX,
  MANIFEST_FILE,
  NAME_PATTERN,
  PACKAGE_SCOPE,
  PRESETS,
  SCHEMA_VERSION,
} from './constants.js';
export { parseManifest } from './manifest.js';
export { checkCoverage, planAdd, planHeadline } from './plan.js';
export { MANIFEST_SCHEMA } from './schema.js';
export type * from './types.js';
export { hasCode, packageName } from './utils.js';
