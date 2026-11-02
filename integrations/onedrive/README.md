# onedrive

> **Status:** draft — not published.

Let a task list, upload and download files in OneDrive.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call OneDrive with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add onedrive --task my-task
ignitify secret:set MICROSOFT_TENANT_ID --stdin
ignitify secret:set MICROSOFT_CLIENT_ID --stdin
ignitify secret:set MICROSOFT_CLIENT_SECRET --stdin
ignitify secret:set MICROSOFT_REFRESH_TOKEN --stdin
```

The plan adds the secret names `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REFRESH_TOKEN` and an egress network limited to `login.microsoftonline.com`, `graph.microsoft.com`. There is nothing for you to add.

Get the credentials first: [OneDrive docs](https://learn.microsoft.com/onedrive/developer/rest-api/).

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

// payload: {}
export async function run(payload, ctx) {
  const token = await graphToken(ctx.secrets);
  const res = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children?$select=id,name', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Microsoft Graph answered ${res.status}`);
  return { names: (await res.json()).value.map((f) => f.name) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Move files.** Download a file here and upload it with [`s3-storage`](../s3-storage/README.md), or the reverse.
- **Summarise a document.** Read a file, summarise it with [`anthropic`](../anthropic/README.md), and post the summary to [`slack`](../slack/README.md).
- **Back up a folder.** List it and copy each file to [`s3-storage`](../s3-storage/README.md).
- **Receive OneDrive events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a OneDrive event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
