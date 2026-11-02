# gmail

> **Status:** draft — not published.

Let a task send and read email in a Gmail or Google Workspace mailbox.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Gmail with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add gmail --task my-task
ignitify secret:set GOOGLE_CLIENT_ID --stdin
ignitify secret:set GOOGLE_CLIENT_SECRET --stdin
ignitify secret:set GOOGLE_REFRESH_TOKEN --stdin
```

The plan adds the secret names `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and an egress network limited to `oauth2.googleapis.com`, `gmail.googleapis.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Gmail docs](https://developers.google.com/gmail/api/quickstart/nodejs).

## Use it

`npm install @googleapis/gmail`, then:

```ts
import { auth, gmail } from '@googleapis/gmail';

export async function run(payload, ctx) {
  const client = new auth.OAuth2(ctx.secrets.GOOGLE_CLIENT_ID, ctx.secrets.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: ctx.secrets.GOOGLE_REFRESH_TOKEN });
  const api = gmail({ version: 'v1', auth: client });
  // payload: { "to": "a@example.com", "subject": "Report", "text": "It is ready." }
  const mail = [`To: ${payload.to}`, `Subject: ${payload.subject}`, '', payload.text].join('\r\n');
  const sent = await api.users.messages.send({
    userId: 'me',
    requestBody: { raw: Buffer.from(mail).toString('base64url') },
  });
  return { id: sent.data.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Mail the report when a run ends.** Build the text in `run()` and send it as the last step.
- **Send a link, not an attachment.** Upload a big file with [`s3-storage`](../s3-storage/README.md) and put the presigned link in the mail.
- **Mail a list.** Read the recipients from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md), and send one mail to each. Wait between sends.
- **Receive Gmail events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Gmail event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
