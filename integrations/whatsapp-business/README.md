# whatsapp-business

> **Status:** draft — not published.

Let a task send WhatsApp messages from a business number (Cloud API).

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call WhatsApp Business with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add whatsapp-business --task my-task
ignitify secret:set WHATSAPP_ACCESS_TOKEN --stdin
```

The plan adds the secret names `WHATSAPP_ACCESS_TOKEN` and an egress network limited to `graph.facebook.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [WhatsApp Business docs](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "phone_number_id": "...", "to": "15551234567", "text": "Your order shipped" }
export async function run(payload, ctx) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${payload.phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.secrets.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: payload.to, type: 'text', text: { body: payload.text } }),
  });
  if (!res.ok) throw new Error(`WhatsApp answered ${res.status}`);
  return { id: (await res.json()).messages?.[0]?.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Tell people when a long task ends.** Send one message at the end of `run()`, and a second one from a `catch` block when the work fails.
- **Send a link to a big result.** A task result is at most 10 KiB. Upload the file with [`s3-storage`](../s3-storage/README.md) and send the link.
- **Post a digest from another service.** Read open issues from [`github`](../github/README.md) or new deals from [`hubspot`](../hubspot/README.md), then post one line for each.
- **Receive WhatsApp Business events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a WhatsApp Business event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- Outside the 24-hour reply window, WhatsApp accepts only approved template messages.
