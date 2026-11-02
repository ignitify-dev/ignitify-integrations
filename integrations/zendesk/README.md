# zendesk

> **Status:** draft — not published.

Let a task create, read and update Zendesk Support tickets.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Zendesk with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add zendesk --task my-task
ignitify secret:set ZENDESK_EMAIL --stdin
ignitify secret:set ZENDESK_API_TOKEN --stdin
```

The plan adds the secret names `ZENDESK_EMAIL`, `ZENDESK_API_TOKEN` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your help-centre host: `<subdomain>.zendesk.com`.

Get the credentials first: [Zendesk docs](https://developer.zendesk.com/api-reference/introduction/security-and-auth/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "subdomain": "acme", "subject": "Run failed", "body": "See the logs." }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.subdomain}.zendesk.com/api/v2/tickets.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.ZENDESK_EMAIL}/token:${ctx.secrets.ZENDESK_API_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticket: { subject: payload.subject, comment: { body: payload.body } } }),
  });
  if (!res.ok) throw new Error(`Zendesk answered ${res.status}`);
  return { id: (await res.json()).ticket.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Triage tickets.** Read new tickets, label them with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), and write the label back.
- **Open a ticket when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Escalate to engineering.** Create a [`jira`](../jira/README.md) or [`linear`](../linear/README.md) issue from a ticket.
- **Receive Zendesk events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Zendesk event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
