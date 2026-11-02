# airtable

> **Status:** draft — not published.

Let a task read and write Airtable records.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Airtable with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add airtable --task my-task
ignitify secret:set AIRTABLE_TOKEN --stdin
```

The plan adds the secret names `AIRTABLE_TOKEN` and an egress network limited to `api.airtable.com`. There is nothing for you to add.

Get the credentials first: [Airtable docs](https://airtable.com/developers/web/api/introduction).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "base_id": "app...", "table": "Runs", "fields": { "Status": "ok" } }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.airtable.com/v0/${payload.base_id}/${encodeURIComponent(payload.table)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.secrets.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields: payload.fields }] }),
  });
  if (!res.ok) throw new Error(`Airtable answered ${res.status}`);
  return { ids: (await res.json()).records.map((r) => r.id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Store task output.** Write one row for each run: status, counts, a link.
- **A work queue.** Read the next open job, do the work, and mark it done.
- **Big files.** Keep them in [`s3-storage`](../s3-storage/README.md) and store only the link in a row.

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- Airtable allows about 5 requests per second per base and 10 records per write.
