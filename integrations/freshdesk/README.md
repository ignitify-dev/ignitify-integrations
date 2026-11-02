# freshdesk

> **Status:** draft — not published.

Let a task create, read and update Freshdesk tickets.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Freshdesk with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add freshdesk --task my-task
ignitify secret:set FRESHDESK_API_KEY --stdin
```

The plan adds the secret names `FRESHDESK_API_KEY` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your helpdesk host: `<domain>.freshdesk.com`.

Get the credentials first: [Freshdesk docs](https://developers.freshdesk.com/api/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "domain": "acme", "email": "a@example.com", "subject": "Run failed", "description": "See the logs." }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.domain}.freshdesk.com/api/v2/tickets`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.FRESHDESK_API_KEY}:X`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      subject: payload.subject,
      description: payload.description,
      status: 2,
      priority: 1,
    }),
  });
  if (!res.ok) throw new Error(`Freshdesk answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **Triage tickets.** Read new tickets, label them with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), and write the label back.
- **Open a ticket when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Escalate to engineering.** Create a [`jira`](../jira/README.md) or [`linear`](../linear/README.md) issue from a ticket.
- **Receive Freshdesk events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Freshdesk event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
