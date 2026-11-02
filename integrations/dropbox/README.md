# dropbox

> **Status:** draft — not published.

Let a task list, upload and download files in Dropbox.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Dropbox with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add dropbox --task my-task
ignitify secret:set DROPBOX_APP_KEY --stdin
ignitify secret:set DROPBOX_APP_SECRET --stdin
ignitify secret:set DROPBOX_REFRESH_TOKEN --stdin
```

The plan adds the secret names `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` and an egress network limited to `api.dropboxapi.com`, `content.dropboxapi.com`, `api.dropbox.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Dropbox docs](https://www.dropbox.com/developers/documentation/http/documentation).

## Use it

`npm install dropbox`, then:

```ts
import { Dropbox } from 'dropbox';

// payload: { "path": "/reports" }
export async function run(payload, ctx) {
  const dbx = new Dropbox({
    clientId: ctx.secrets.DROPBOX_APP_KEY,
    clientSecret: ctx.secrets.DROPBOX_APP_SECRET,
    refreshToken: ctx.secrets.DROPBOX_REFRESH_TOKEN,
  });
  const { result } = await dbx.filesListFolder({ path: payload.path });
  return { names: result.entries.map((e) => e.name) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Move files.** Download a file here and upload it with [`s3-storage`](../s3-storage/README.md), or the reverse.
- **Summarise a document.** Read a file, summarise it with [`anthropic`](../anthropic/README.md), and post the summary to [`slack`](../slack/README.md).
- **Back up a folder.** List it and copy each file to [`s3-storage`](../s3-storage/README.md).
- **Receive Dropbox events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Dropbox event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
