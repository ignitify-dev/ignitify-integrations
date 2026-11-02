# hubspot

> **Status:** draft — not published.

Let a task read and write HubSpot contacts, companies and deals.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call HubSpot with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add hubspot --task my-task
ignitify secret:set HUBSPOT_ACCESS_TOKEN --stdin
```

The plan adds the secret names `HUBSPOT_ACCESS_TOKEN` and an egress network limited to `api.hubapi.com`. There is nothing for you to add.

Get the credentials first: [HubSpot docs](https://developers.hubspot.com/docs/api/private-apps).

## Use it

`npm install @hubspot/api-client`, then:

```ts
import { Client } from '@hubspot/api-client';

// payload: { "email": "a@example.com", "firstname": "Ada" }
export async function run(payload, ctx) {
  const hubspot = new Client({ accessToken: ctx.secrets.HUBSPOT_ACCESS_TOKEN });
  const contact = await hubspot.crm.contacts.basicApi.create({
    properties: { email: payload.email, firstname: payload.firstname },
  });
  return { id: contact.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Enrich records.** Read new records, classify them with [`openai`](../openai/README.md) or [`anthropic`](../anthropic/README.md), and write the label back.
- **Push leads in.** Create a record for each new [`typeform`](../typeform/README.md) response.
- **Report to the team.** Post a short pipeline summary to [`slack`](../slack/README.md).
- **Receive HubSpot events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a HubSpot event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
