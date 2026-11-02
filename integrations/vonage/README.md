# vonage

> **Status:** draft — not published.

Let a task send SMS through the Vonage SMS API.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Vonage with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add vonage --task my-task
ignitify secret:set VONAGE_API_KEY --stdin
ignitify secret:set VONAGE_API_SECRET --stdin
```

The plan adds the secret names `VONAGE_API_KEY`, `VONAGE_API_SECRET` and an egress network limited to `rest.nexmo.com`, `api.nexmo.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Vonage docs](https://developer.vonage.com/en/messaging/sms/overview).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "to": "15551234567", "from": "Reports", "text": "Run failed" }
export async function run(payload, ctx) {
  const res = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    body: new URLSearchParams({
      api_key: ctx.secrets.VONAGE_API_KEY,
      api_secret: ctx.secrets.VONAGE_API_SECRET,
      to: payload.to,
      from: payload.from,
      text: payload.text,
    }),
  });
  if (!res.ok) throw new Error(`Vonage answered ${res.status}`);
  const [first] = (await res.json()).messages;
  return { id: first['message-id'], status: first.status };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Wake a person when a run fails.** Send an SMS from the `catch` block of a long task.
- **Send one message for each row.** Read numbers and texts from [`airtable`](../airtable/README.md) and send them one by one.
- **Pick the channel.** Post to [`slack`](../slack/README.md) for routine news; send an SMS only for failures.
- **Receive Vonage events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Vonage event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- Vonage answers 200 even when a message is refused: check `status` ("0" is success).
