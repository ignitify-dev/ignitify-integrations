# @ignitify-integrations/core

## 0.1.2

### Patch Changes

- Task configs may hold the platform's exact-path inbound routes ({ path }) next to prefix routes. A path route is kept as it is and never covers a prefix route. Manifests are unchanged.

## 0.1.1

### Patch Changes

- The manifest schema applies the platform limits: at most 32 inbound routes (`INBOUND_ROUTES_MAX`), a route at most 256 characters (`INBOUND_ROUTE_MAX_LENGTH`), a secret name at most 64 characters. Needs runtime 0.1.1.
