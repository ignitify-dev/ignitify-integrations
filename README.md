# ignitify integrations

Open-source building blocks for [ignitify](https://ignitify.dev) tasks. Add a service or a feature to a task with one command:

```bash
ignitify integration:add s3-storage --task report
ignitify integration:add telegram --task report
ignitify integration:add stream --task live
```

An integration is one npm package, `@ignitify-integrations/<name>`, with an `integration.yaml` inside. Its code is optional. The CLI installs the package, reads the manifest, and shows a plan of every setting it will write into the task's `task.yaml` (secret names, egress hosts, network, system packages, preset). It writes only after a yes. Nothing is hidden: `task.yaml` stays the one place that says what a task may do.

## What is here

| Integration                             | Has                                           | What the tenant no longer builds                             |
| :-------------------------------------- | :-------------------------------------------- | :----------------------------------------------------------- |
| [`telegram`](integrations/telegram)     | settings only                                 | the secret and host setup to send a message                  |
| [`s3-storage`](integrations/s3-storage) | settings + code                               | upload, presigned link and download; a way past 10 KiB       |
| [`stream`](integrations/stream)         | settings + code + `system_packages: [ffmpeg]` | the server, player, progress and stop plumbing of a live HLS |

The [index of all integrations](integrations/README.md) lists them by category, with about 100 drafts that are not published yet.

Every integration has an `integration.yaml` manifest ([format](artifacts/ignitify-integrations/architect/ADR-0002-integration-store-open-work/ADR-0002-integration-store-open-work.md#3-the-manifest-integrationyaml)). Shared code lives in two packages:

- [`runtime`](runtime) — zero-dependency helpers used at run time inside a task (`TaskCtx`, `Result`, `readSecret`).
- [`core`](core) — the manifest schema and the pure planning logic the ignitify CLI uses.

The [guide](docs/guide/README.md) shows how to build tasks on ignitify and how to combine integrations.

## Using an integration without the CLI

The store is an option, never a gate. You can install a package with npm and write the settings into `task.yaml` yourself, or write your own code.

## Development

```bash
npm ci --ignore-scripts
npm run check        # lint, format, typecheck, tests, integration checks, licence check
npm run new-item -- my-service [--code] [--draft]
```

Requires Node 22. See [CONTRIBUTING.md](CONTRIBUTING.md) and [writing an integration](artifacts/ignitify-integrations/architect/ADR-0002-integration-store-open-work/ADR-0002-integration-store-open-work.md#4-writing-an-integration).

## Licence

Apache-2.0. The READMEs and the guide are MIT-0, so you can copy their example code into your task with no notice. See [LICENSE](LICENSE) and [REUSE.toml](REUSE.toml).
