# confluence

> **Status:** draft — not published.

Let a task create and read Confluence pages.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Confluence with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add confluence --task my-task
ignitify secret:set ATLASSIAN_EMAIL --stdin
ignitify secret:set ATLASSIAN_API_TOKEN --stdin
```

The plan adds the secret names `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your Atlassian site host: `<site>.atlassian.net`.

Get the credentials first: [Confluence docs](https://developer.atlassian.com/cloud/confluence/rest/v2/intro/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "site": "acme", "space_id": "123456", "title": "Run report", "html": "<p>All green.</p>" }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.site}.atlassian.net/wiki/api/v2/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.ATLASSIAN_EMAIL}:${ctx.secrets.ATLASSIAN_API_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spaceId: payload.space_id,
      status: 'current',
      title: payload.title,
      body: { representation: 'storage', value: payload.html },
    }),
  });
  if (!res.ok) throw new Error(`Confluence answered ${res.status}`);
  return { id: (await res.json()).id };
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
