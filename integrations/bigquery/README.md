# bigquery

> **Status:** draft — not published.

Let a task run queries and load rows in Google BigQuery.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call BigQuery with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add bigquery --task my-task
ignitify secret:set GCP_SERVICE_ACCOUNT_KEY --stdin
```

The plan adds the secret names `GCP_SERVICE_ACCOUNT_KEY` and an egress network limited to `oauth2.googleapis.com`, `bigquery.googleapis.com`. There is nothing for you to add.

Get the credentials first: [BigQuery docs](https://cloud.google.com/bigquery/docs/reference/libraries).

## Use it

`npm install @google-cloud/bigquery`, then:

```ts
import { BigQuery } from '@google-cloud/bigquery';

// payload: { "sql": "SELECT COUNT(*) AS n FROM `project.dataset.runs`" }
export async function run(payload, ctx) {
  const credentials = JSON.parse(ctx.secrets.GCP_SERVICE_ACCOUNT_KEY);
  const bigquery = new BigQuery({ credentials, projectId: credentials.project_id });
  const [rows] = await bigquery.query({ query: payload.sql });
  return { rows: rows.slice(0, 50) };
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
- The secret holds a whole service-account key (JSON).
