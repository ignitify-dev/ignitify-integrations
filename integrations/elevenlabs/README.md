# elevenlabs

> **Status:** draft — not published.

Let a task turn text into speech and speech into text with ElevenLabs.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call ElevenLabs with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add elevenlabs --task my-task
ignitify secret:set ELEVENLABS_API_KEY --stdin
```

The plan adds the secret names `ELEVENLABS_API_KEY` and an egress network limited to `api.elevenlabs.io`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [ElevenLabs docs](https://elevenlabs.io/docs/quickstart).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "voice_id": "...", "text": "The report is ready." }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${payload.voice_id}`, {
    method: 'POST',
    headers: { 'xi-api-key': ctx.secrets.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: payload.text }),
  });
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}`);
  const audio = Buffer.from(await res.arrayBuffer());
  // The audio is bigger than a 10 KiB result: upload it with s3-storage and return the link.
  return { bytes: audio.length };
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
