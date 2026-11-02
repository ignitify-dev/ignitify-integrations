# typeform

> **Status:** draft — not published.

Let a task read Typeform forms and responses.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Typeform with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add typeform --task my-task
ignitify secret:set TYPEFORM_TOKEN --stdin
```

The plan adds the secret names `TYPEFORM_TOKEN` and an egress network limited to `api.typeform.com`, `api.eu.typeform.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Typeform docs](https://www.typeform.com/developers/get-started/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "form_id": "abc123" }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.typeform.com/forms/${payload.form_id}/responses?page_size=25`, {
    headers: { Authorization: `Bearer ${ctx.secrets.TYPEFORM_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Typeform answered ${res.status}`);
  return { total: (await res.json()).total_items };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Responses to a sheet.** Copy new responses to [`google-sheets`](../google-sheets/README.md).
- **Route responses.** Create a [`hubspot`](../hubspot/README.md) contact or a [`linear`](../linear/README.md) issue for each response.
- **Receive Typeform events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Typeform event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
