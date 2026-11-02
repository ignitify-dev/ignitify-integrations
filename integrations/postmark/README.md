# postmark

> **Status:** draft — not published.

Let a task send transactional email through Postmark.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Postmark with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add postmark --task my-task
ignitify secret:set POSTMARK_SERVER_TOKEN --stdin
```

The plan adds the secret names `POSTMARK_SERVER_TOKEN` and an egress network limited to `api.postmarkapp.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Postmark docs](https://postmarkapp.com/developer).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "to": "a@example.com", "from": "reports@example.com", "subject": "Report", "text": "It is ready." }
export async function run(payload, ctx) {
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': ctx.secrets.POSTMARK_SERVER_TOKEN,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ From: payload.from, To: payload.to, Subject: payload.subject, TextBody: payload.text }),
  });
  if (!res.ok) throw new Error(`Postmark answered ${res.status}`);
  return { id: (await res.json()).MessageID };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Mail the report when a run ends.** Build the text in `run()` and send it as the last step.
- **Send a link, not an attachment.** Upload a big file with [`s3-storage`](../s3-storage/README.md) and put the presigned link in the mail.
- **Mail a list.** Read the recipients from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md), and send one mail to each. Wait between sends.
- **Receive Postmark events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Postmark event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
