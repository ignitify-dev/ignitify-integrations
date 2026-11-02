# servicenow

> **Status:** draft — not published.

Let a task create and read ServiceNow incidents and table records.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call ServiceNow with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add servicenow --task my-task
ignitify secret:set SERVICENOW_USERNAME --stdin
ignitify secret:set SERVICENOW_PASSWORD --stdin
```

The plan adds the secret names `SERVICENOW_USERNAME`, `SERVICENOW_PASSWORD` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your instance host: `<instance>.service-now.com`.

Get the credentials first: [ServiceNow docs](https://developer.servicenow.com/dev.do#!/reference/api/latest/rest/c_TableAPI).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "instance": "acme", "short_description": "Run failed" }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.instance}.service-now.com/api/now/table/incident`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.SERVICENOW_USERNAME}:${ctx.secrets.SERVICENOW_PASSWORD}`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ short_description: payload.short_description }),
  });
  if (!res.ok) throw new Error(`ServiceNow answered ${res.status}`);
  return { number: (await res.json()).result.number };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **Triage tickets.** Read new tickets, label them with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), and write the label back.
- **Open a ticket when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Escalate to engineering.** Create a [`jira`](../jira/README.md) or [`linear`](../linear/README.md) issue from a ticket.
- **Receive ServiceNow events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a ServiceNow event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The platform has no fixed egress IP. An account that allows only listed source IPs refuses the task.
