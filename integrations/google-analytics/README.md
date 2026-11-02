# google-analytics

> **Status:** draft — not published.

Let a task run Google Analytics 4 reports and send events.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Google Analytics with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add google-analytics --task my-task
ignitify secret:set GOOGLE_SERVICE_ACCOUNT_KEY --stdin
```

The plan adds the secret names `GOOGLE_SERVICE_ACCOUNT_KEY` and an egress network limited to `oauth2.googleapis.com`, `analyticsdata.googleapis.com`, `www.google-analytics.com`. There is nothing for you to add.

Get the credentials first: [Google Analytics docs](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries).

## Use it

`npm install @google-analytics/data`, then:

```ts
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// payload: { "property_id": "123456789" }
export async function run(payload, ctx) {
  const client = new BetaAnalyticsDataClient({ credentials: JSON.parse(ctx.secrets.GOOGLE_SERVICE_ACCOUNT_KEY) });
  const [report] = await client.runReport({
    property: `properties/${payload.property_id}`,
    dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
    metrics: [{ name: 'activeUsers' }],
  });
  return { active_users: report.rows?.[0]?.metricValues?.[0]?.value ?? '0' };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Track your tasks.** Send one event for each run (name, duration, result) and see usage in the dashboard.
- **Weekly metrics post.** Read a report and post the main numbers to [`slack`](../slack/README.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The secret holds a whole service-account key (JSON). Give the service account read access to the property.
