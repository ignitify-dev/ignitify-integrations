# replicate

> **Status:** draft — not published.

Let a task run open-source models on Replicate (images, audio, text).

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Replicate with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add replicate --task my-task
ignitify secret:set REPLICATE_API_TOKEN --stdin
```

The plan adds the secret names `REPLICATE_API_TOKEN` and an egress network limited to `api.replicate.com`, `replicate.delivery`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Replicate docs](https://replicate.com/docs/get-started/nodejs).

## Use it

`npm install replicate`, then:

```ts
import Replicate from 'replicate';

// payload: { "model": "owner/name", "input": { "prompt": "a lighthouse at dawn" } }
export async function run(payload, ctx) {
  const replicate = new Replicate({ auth: ctx.secrets.REPLICATE_API_TOKEN });
  const output = await replicate.run(payload.model, { input: payload.input, useFileOutput: false });
  return { output: JSON.stringify(output).slice(0, 4000) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Summarise and route.** Summarise a [`zendesk`](../zendesk/README.md) ticket or a [`gmail`](../gmail/README.md) thread and post the summary to [`slack`](../slack/README.md).
- **Classify records.** Label CRM or support records and write the label back.
- **Big outputs.** Files (audio, images, long text) go to [`s3-storage`](../s3-storage/README.md); return the link.
- **Long jobs.** For long generations, use a long-running task (`execution.duration: long`).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
