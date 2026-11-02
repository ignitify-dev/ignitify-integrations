# Use an integration

An integration is an npm package, `@ignitify-integrations/<name>`. It carries an `integration.yaml` that says what your task needs: secrets, hosts, network, system packages and a minimum preset. The CLI reads it and changes `task.yaml` for you. The [index](../../integrations/README.md) lists every integration.

> `integration:add` and `task:validate` are not released yet. Until they are, use the integration without the CLI (see the end of this chapter).

## 1. Add it

```bash
ignitify integration:add s3-storage --task report
```

The CLI installs the package, reads its manifest and prints a plan. Nothing changes until you say yes.

- `--dry-run` prints the plan and stops.
- `--yes` applies it without the question. With no terminal and no `--yes`, the CLI refuses.

## 2. Read the plan

Line 1 says what you get:

```text
@ignitify-integrations/s3-storage@0.1.0 · settings + code
```

- `settings only`: the package changes settings and has no code. You call the vendor with its own SDK or `fetch`.
- `settings + code`: the package has code you import.
- `runs ffmpeg`: the package runs that system package as a separate process.

Then the plan lists every change to `task.yaml`: secret names, hosts, network type, routes, preset. A setting is only ever raised, never lowered. If a setting conflicts with what your task already has, the CLI refuses and tells you which field to change by hand.

## 3. Do the "you add" lines

The plan ends with what only you can do:

```text
secret S3_ACCESS_KEY_ID (new): ignitify secret:set S3_ACCESS_KEY_ID --stdin
secret S3_SECRET_ACCESS_KEY (new): ignitify secret:set S3_SECRET_ACCESS_KEY --stdin
egress host: your bucket host: <bucket>.s3.<region>.amazonaws.com on AWS, or the host of your custom endpoint
```

- Set each secret value. `(new)` means your task did not declare that secret before.
- Add each host to `execution.network.egress_allow`. These hosts are different for every tenant, so the integration cannot know them.

## 4. Check the task

```bash
ignitify task:validate
```

It checks that `task.yaml` still covers every installed integration: secrets, hosts, network, routes, system packages and preset. Run it after you change `task.yaml` by hand.

## 5. Use it in your code

Each integration's README has a "Use it" section. For `s3-storage`:

```js
import { storage } from '@ignitify-integrations/s3-storage';

export async function run(payload, ctx) {
  const store = storage(ctx, { bucket: 'acme-reports', region: 'eu-west-1' });
  return { url: await store.putAndLink('/tmp/report.pdf') };
}
```

## Remove it

```bash
npm uninstall @ignitify-integrations/s3-storage
```

The settings it added stay in `task.yaml`. Remove the secrets and hosts you no longer need.

## Without the CLI

The store is an option, never a gate. Install the package with npm, and copy the settings from its `integration.yaml` into `task.yaml` yourself: the README's "Add it" section lists them.
