# snowflake

> **Status:** draft — not published.

Let a task run SQL on Snowflake through the SQL API.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Snowflake with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add snowflake --task my-task
ignitify secret:set SNOWFLAKE_TOKEN --stdin
```

The plan adds the secret names `SNOWFLAKE_TOKEN` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your account host: `<account>.snowflakecomputing.com`.

Get the credentials first: [Snowflake docs](https://docs.snowflake.com/en/developer-guide/sql-api/index).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "account": "acme-xy12345", "sql": "select count(*) from runs", "warehouse": "TASKS" }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.account}.snowflakecomputing.com/api/v2/statements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.secrets.SNOWFLAKE_TOKEN}`,
      'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ statement: payload.sql, warehouse: payload.warehouse, timeout: 60 }),
  });
  if (!res.ok) throw new Error(`Snowflake answered ${res.status}`);
  return { rows: (await res.json()).data };
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
- The platform has no fixed egress IP. An account that allows only listed source IPs refuses the task.
