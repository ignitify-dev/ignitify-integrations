# google-docs

> **Status:** draft — not published.

Let a task create and read Google Docs documents.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Google Docs with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add google-docs --task my-task
ignitify secret:set GOOGLE_CLIENT_ID --stdin
ignitify secret:set GOOGLE_CLIENT_SECRET --stdin
ignitify secret:set GOOGLE_REFRESH_TOKEN --stdin
```

The plan adds the secret names `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and an egress network limited to `oauth2.googleapis.com`, `docs.googleapis.com`. There is nothing for you to add.

Get the credentials first: [Google Docs docs](https://developers.google.com/docs/api/quickstart/nodejs).

## Use it

`npm install @googleapis/docs`, then:

```ts
import { auth, docs } from '@googleapis/docs';

export async function run(payload, ctx) {
  const client = new auth.OAuth2(ctx.secrets.GOOGLE_CLIENT_ID, ctx.secrets.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: ctx.secrets.GOOGLE_REFRESH_TOKEN });
  const api = docs({ version: 'v1', auth: client });
  // payload: { "title": "Run report" }
  const { data } = await api.documents.create({ requestBody: { title: payload.title } });
  return { id: data.documentId };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Write the run report as a page.** Create one page or document for each run.
- **Answer from your docs.** Read pages and give them to [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md) as context.
- **Turn data into a report.** Read rows from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md) and write a summary page.

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
