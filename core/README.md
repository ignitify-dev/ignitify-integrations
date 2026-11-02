# @ignitify-integrations/core

The contract of the integrations store, for repo tools and the ignitify CLI. It is not used inside a task.

| Export                                     | What                                                                                      |
| :----------------------------------------- | :---------------------------------------------------------------------------------------- |
| `MANIFEST_SCHEMA`                          | JSON Schema of `integration.yaml`, built from the constants                               |
| `parseManifest(text)`                      | YAML → a checked `Manifest`, or every problem with its path                               |
| `packageName(name)`                        | The npm name `@ignitify-integrations/<name>`                                              |
| `planHeadline(manifest, version, hasCode)` | Line 1 of the `integration:add` plan                                                      |
| `planAdd(config, manifest)`                | The `task.yaml` after `integration:add`, plus notes and "you add" lines, or every refusal |
| `checkCoverage(config, manifests)`         | What `task.yaml` no longer covers, for `task:validate`                                    |

Every function is pure: it takes data and returns data, and never mutates its input.
