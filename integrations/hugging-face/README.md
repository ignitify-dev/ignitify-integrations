# hugging-face

> **Status:** draft — not published.

Let a task run models through Hugging Face inference providers and read the Hub.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Hugging Face with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add hugging-face --task my-task
ignitify secret:set HF_TOKEN --stdin
```

The plan adds the secret names `HF_TOKEN` and an egress network limited to `router.huggingface.co`, `huggingface.co`. There is nothing for you to add.

Get the credentials first: [Hugging Face docs](https://huggingface.co/docs/inference-providers/index).

## Use it

`npm install @huggingface/inference`, then:

```ts
import { InferenceClient } from '@huggingface/inference';

// payload: { "model": "<model id>", "prompt": "Summarise: ..." }
export async function run(payload, ctx) {
  const hf = new InferenceClient(ctx.secrets.HF_TOKEN);
  const out = await hf.chatCompletion({ model: payload.model, messages: [{ role: 'user', content: payload.prompt }] });
  return { text: String(out.choices[0].message.content ?? '').slice(0, 4000) };
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
- Downloading model files from the Hub can redirect to CDN hosts that are not listed here.
