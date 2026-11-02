# intercom

> **Status:** draft — not published.

Let a task read and reply to Intercom conversations and manage contacts.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Intercom with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add intercom --task my-task
ignitify secret:set INTERCOM_ACCESS_TOKEN --stdin
```

The plan adds the secret names `INTERCOM_ACCESS_TOKEN` and an egress network limited to `api.intercom.io`, `api.eu.intercom.io`, `api.au.intercom.io`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Intercom docs](https://developers.intercom.com/docs/build-an-integration/learn-more/authentication).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "email": "a@example.com" }
export async function run(payload, ctx) {
  const res = await fetch('https://api.intercom.io/contacts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.secrets.INTERCOM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ role: 'user', email: payload.email }),
  });
  if (!res.ok) throw new Error(`Intercom answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Triage tickets.** Read new tickets, label them with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), and write the label back.
- **Open a ticket when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Escalate to engineering.** Create a [`jira`](../jira/README.md) or [`linear`](../linear/README.md) issue from a ticket.
- **Receive Intercom events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Intercom event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
