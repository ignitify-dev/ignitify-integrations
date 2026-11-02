# box

> **Status:** draft — not published.

Let a task list, upload and download files in Box.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Box with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add box --task my-task
ignitify secret:set BOX_CLIENT_ID --stdin
ignitify secret:set BOX_CLIENT_SECRET --stdin
ignitify secret:set BOX_ENTERPRISE_ID --stdin
```

The plan adds the secret names `BOX_CLIENT_ID`, `BOX_CLIENT_SECRET`, `BOX_ENTERPRISE_ID` and an egress network limited to `api.box.com`, `upload.box.com`. There is nothing for you to add.

Get the credentials first: [Box docs](https://developer.box.com/guides/authentication/client-credentials/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "folder_id": "0" }
export async function run(payload, ctx) {
  const tokenRes = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ctx.secrets.BOX_CLIENT_ID,
      client_secret: ctx.secrets.BOX_CLIENT_SECRET,
      box_subject_type: 'enterprise',
      box_subject_id: ctx.secrets.BOX_ENTERPRISE_ID,
    }),
  });
  const { access_token } = await tokenRes.json();
  const res = await fetch(`https://api.box.com/2.0/folders/${payload.folder_id}/items`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`Box answered ${res.status}`);
  return { names: (await res.json()).entries.map((e) => e.name) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Move files.** Download a file here and upload it with [`s3-storage`](../s3-storage/README.md), or the reverse.
- **Summarise a document.** Read a file, summarise it with [`anthropic`](../anthropic/README.md), and post the summary to [`slack`](../slack/README.md).
- **Back up a folder.** List it and copy each file to [`s3-storage`](../s3-storage/README.md).
- **Receive Box events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Box event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
