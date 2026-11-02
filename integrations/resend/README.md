# resend

> **Status:** draft — not published.

Let a task send transactional email through Resend.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Resend with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add resend --task my-task
ignitify secret:set RESEND_API_KEY --stdin
```

The plan adds the secret names `RESEND_API_KEY` and an egress network limited to `api.resend.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Resend docs](https://resend.com/docs/send-with-nodejs).

## Use it

`npm install resend`, then:

```ts
import { Resend } from 'resend';

// payload: { "to": "a@example.com", "from": "reports@example.com", "subject": "Report", "html": "<p>It is ready.</p>" }
export async function run(payload, ctx) {
  const resend = new Resend(ctx.secrets.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
  if (error) throw new Error(`Resend refused the email: ${error.message}`);
  return { id: data.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Mail the report when a run ends.** Build the text in `run()` and send it as the last step.
- **Send a link, not an attachment.** Upload a big file with [`s3-storage`](../s3-storage/README.md) and put the presigned link in the mail.
- **Mail a list.** Read the recipients from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md), and send one mail to each. Wait between sends.
- **Receive Resend events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Resend event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
