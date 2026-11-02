# jira

> **Status:** draft — not published.

Let a task create, search and update Jira issues.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Jira with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add jira --task my-task
ignitify secret:set ATLASSIAN_EMAIL --stdin
ignitify secret:set ATLASSIAN_API_TOKEN --stdin
```

The plan adds the secret names `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your Atlassian site host: `<site>.atlassian.net`.

Get the credentials first: [Jira docs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "site": "acme", "project": "OPS", "summary": "Nightly run failed" }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.site}.atlassian.net/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.ATLASSIAN_EMAIL}:${ctx.secrets.ATLASSIAN_API_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: { project: { key: payload.project }, summary: payload.summary, issuetype: { name: 'Task' } },
    }),
  });
  if (!res.ok) throw new Error(`Jira answered ${res.status}`);
  return { key: (await res.json()).key };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Open an issue when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Daily digest.** List the items due today and post them to [`slack`](../slack/README.md) or [`microsoft-teams`](../microsoft-teams/README.md).
- **Tasks from a form.** Create one item for each new [`typeform`](../typeform/README.md) response.
- **Receive Jira events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Jira event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
