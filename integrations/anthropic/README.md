# anthropic

> **Status:** draft — not published.

Let a task call Claude models for text, tool use and structured output.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Anthropic with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add anthropic --task my-task
ignitify secret:set ANTHROPIC_API_KEY --stdin
```

The plan adds the secret names `ANTHROPIC_API_KEY` and an egress network limited to `api.anthropic.com`. There is nothing for you to add.

Get the credentials first: [Anthropic docs](https://docs.anthropic.com/en/api/getting-started).

## Use it

`npm install @anthropic-ai/sdk`, then:

```ts
import Anthropic from '@anthropic-ai/sdk';

// payload: { "model": "<model id>", "prompt": "Summarise: ..." }
export async function run(payload, ctx) {
  const anthropic = new Anthropic({ apiKey: ctx.secrets.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: payload.model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: payload.prompt }],
  });
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return { text: text.slice(0, 4000) };
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
