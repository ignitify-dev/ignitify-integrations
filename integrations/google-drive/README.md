# google-drive

> **Status:** draft — not published.

Let a task list, upload and download files in Google Drive.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Google Drive with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add google-drive --task my-task
ignitify secret:set GOOGLE_CLIENT_ID --stdin
ignitify secret:set GOOGLE_CLIENT_SECRET --stdin
ignitify secret:set GOOGLE_REFRESH_TOKEN --stdin
```

The plan adds the secret names `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and an egress network limited to `oauth2.googleapis.com`, `www.googleapis.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Google Drive docs](https://developers.google.com/drive/api/quickstart/nodejs).

## Use it

`npm install @googleapis/drive`, then:

```ts
import { auth, drive } from '@googleapis/drive';

export async function run(payload, ctx) {
  const client = new auth.OAuth2(ctx.secrets.GOOGLE_CLIENT_ID, ctx.secrets.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: ctx.secrets.GOOGLE_REFRESH_TOKEN });
  const api = drive({ version: 'v3', auth: client });
  // payload: { "folder_id": "..." }
  const { data } = await api.files.list({
    q: `'${payload.folder_id}' in parents`,
    fields: 'files(id, name)',
    pageSize: 20,
  });
  return { files: data.files };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Move files.** Download a file here and upload it with [`s3-storage`](../s3-storage/README.md), or the reverse.
- **Summarise a document.** Read a file, summarise it with [`anthropic`](../anthropic/README.md), and post the summary to [`slack`](../slack/README.md).
- **Back up a folder.** List it and copy each file to [`s3-storage`](../s3-storage/README.md).
- **Receive Google Drive events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Google Drive event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
