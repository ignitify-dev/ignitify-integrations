# @ignitify-integrations/runtime

## 0.1.2

### Patch Changes

- New shared helpers: `redact` and `REDACTED` (remove secret values from a text), and `processStop` (an AbortSignal for SIGTERM and SIGINT, with `release`).

## 0.1.1

### Patch Changes

- `SECRET_NAME_PATTERN` allows at most 64 characters, as the platform does (`SECRET_NAME_MAX_LENGTH`).
