# calendly

> **Status:** draft — not published.

Let a task read Calendly scheduled events and invitees.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Calendly with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add calendly --task my-task
ignitify secret:set CALENDLY_ACCESS_TOKEN --stdin
```

The plan adds the secret names `CALENDLY_ACCESS_TOKEN` and an egress network limited to `api.calendly.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Calendly docs](https://developer.calendly.com/getting-started).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: {}
export async function run(payload, ctx) {
  const headers = { Authorization: `Bearer ${ctx.secrets.CALENDLY_ACCESS_TOKEN}` };
  const me = await (await fetch('https://api.calendly.com/users/me', { headers })).json();
  const res = await fetch(
    `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(me.resource.uri)}&count=10`,
    { headers },
  );
  if (!res.ok) throw new Error(`Calendly answered ${res.status}`);
  return { events: (await res.json()).collection.map((e) => ({ name: e.name, start: e.start_time })) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Daily agenda.** Read today's events and post them to [`slack`](../slack/README.md).
- **Book from a task.** Create an event with a [`zoom`](../zoom/README.md) meeting link in it.
- **Receive Calendly events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Calendly event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
