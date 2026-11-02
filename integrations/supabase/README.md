# supabase

> **Status:** draft — not published.

Let a task read and write a Supabase database and storage over its HTTP APIs.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Supabase with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add supabase --task my-task
ignitify secret:set SUPABASE_SECRET_KEY --stdin
```

The plan adds the secret names `SUPABASE_SECRET_KEY` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your project host: `<project-ref>.supabase.co`.

Get the credentials first: [Supabase docs](https://supabase.com/docs/reference/javascript/introduction).

## Use it

`npm install @supabase/supabase-js`, then:

```ts
import { createClient } from '@supabase/supabase-js';

// payload: { "project_ref": "abcdefghijklmnop", "table": "runs", "row": { "status": "ok" } }
export async function run(payload, ctx) {
  const supabase = createClient(`https://${payload.project_ref}.supabase.co`, ctx.secrets.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.from(payload.table).insert(payload.row).select('id');
  if (error) throw new Error(`Supabase refused the insert: ${error.message}`);
  return { ids: data.map((r) => r.id) };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **Store task output.** Write one row for each run: status, counts, a link.
- **A work queue.** Read the next open job, do the work, and mark it done.
- **Big files.** Keep them in [`s3-storage`](../s3-storage/README.md) and store only the link in a row.

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The secret key bypasses row-level security. Keep it for trusted task code only.
