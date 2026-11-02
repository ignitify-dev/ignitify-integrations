# microsoft-outlook

> **Status:** draft — not published.

Let a task send email and read the mailbox and calendar of a Microsoft 365 account.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Microsoft Outlook with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add microsoft-outlook --task my-task
ignitify secret:set MICROSOFT_TENANT_ID --stdin
ignitify secret:set MICROSOFT_CLIENT_ID --stdin
ignitify secret:set MICROSOFT_CLIENT_SECRET --stdin
ignitify secret:set MICROSOFT_REFRESH_TOKEN --stdin
```

The plan adds the secret names `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REFRESH_TOKEN` and an egress network limited to `login.microsoftonline.com`, `graph.microsoft.com`. There is nothing for you to add.

Get the credentials first: [Microsoft Outlook docs](https://learn.microsoft.com/graph/outlook-mail-concept-overview).

## Use it

With plain `fetch` (no package to install):

```ts
// A new access token on each run, from the refresh token.
async function graphToken(s) {
  const res = await fetch(`https://login.microsoftonline.com/${s.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: s.MICROSOFT_CLIENT_ID,
      client_secret: s.MICROSOFT_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: s.MICROSOFT_REFRESH_TOKEN,
      scope: 'https://graph.microsoft.com/.default offline_access',
    }),
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status}`);
  return (await res.json()).access_token;
}

// payload: { "to": "a@example.com", "subject": "Report", "text": "It is ready." }
export async function run(payload, ctx) {
  const token = await graphToken(ctx.secrets);
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: payload.subject,
        body: { contentType: 'Text', content: payload.text },
        toRecipients: [{ emailAddress: { address: payload.to } }],
      },
    }),
  });
  if (!res.ok) throw new Error(`Microsoft Graph answered ${res.status}`);
  return { sent: true };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Mail the report when a run ends.** Build the text in `run()` and send it as the last step.
- **Send a link, not an attachment.** Upload a big file with [`s3-storage`](../s3-storage/README.md) and put the presigned link in the mail.
- **Mail a list.** Read the recipients from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md), and send one mail to each. Wait between sends.
- **Receive Microsoft Outlook events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Microsoft Outlook event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
