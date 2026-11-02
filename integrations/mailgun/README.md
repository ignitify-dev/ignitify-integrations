# mailgun

> **Status:** draft — not published.

Let a task send transactional email through Mailgun.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Mailgun with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add mailgun --task my-task
ignitify secret:set MAILGUN_API_KEY --stdin
```

The plan adds the secret names `MAILGUN_API_KEY` and an egress network limited to `api.mailgun.net`, `api.eu.mailgun.net`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Mailgun docs](https://documentation.mailgun.com/docs/mailgun/user-manual/get-started/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "domain": "mg.example.com", "to": "a@example.com", "from": "reports@mg.example.com", "subject": "Report", "text": "It is ready." }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.mailgun.net/v3/${payload.domain}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${ctx.secrets.MAILGUN_API_KEY}`).toString('base64')}` },
    body: new URLSearchParams({ from: payload.from, to: payload.to, subject: payload.subject, text: payload.text }),
  });
  if (!res.ok) throw new Error(`Mailgun answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Mail the report when a run ends.** Build the text in `run()` and send it as the last step.
- **Send a link, not an attachment.** Upload a big file with [`s3-storage`](../s3-storage/README.md) and put the presigned link in the mail.
- **Mail a list.** Read the recipients from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md), and send one mail to each. Wait between sends.
- **Receive Mailgun events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Mailgun event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- An EU domain uses `api.eu.mailgun.net`: change the host in the code.
