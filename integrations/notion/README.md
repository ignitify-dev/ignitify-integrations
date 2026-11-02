# notion

> **Status:** draft — not published.

Let a task create and read Notion pages and databases.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Notion with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add notion --task my-task
ignitify secret:set NOTION_TOKEN --stdin
```

The plan adds the secret names `NOTION_TOKEN` and an egress network limited to `api.notion.com`. There is nothing for you to add.

Get the credentials first: [Notion docs](https://developers.notion.com/docs/create-a-notion-integration).

## Use it

`npm install @notionhq/client`, then:

```ts
import { Client } from '@notionhq/client';

// payload: { "parent_page_id": "...", "title": "Run report" }
export async function run(payload, ctx) {
  const notion = new Client({ auth: ctx.secrets.NOTION_TOKEN });
  const page = await notion.pages.create({
    parent: { page_id: payload.parent_page_id },
    properties: { title: { title: [{ text: { content: payload.title } }] } },
  });
  return { id: page.id };
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
