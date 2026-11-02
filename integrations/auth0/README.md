# auth0

> **Status:** draft — not published.

Let a task read and manage Auth0 users through the Management API.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Auth0 with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add auth0 --task my-task
ignitify secret:set AUTH0_CLIENT_ID --stdin
ignitify secret:set AUTH0_CLIENT_SECRET --stdin
```

The plan adds the secret names `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your tenant host: `<tenant>.<region>.auth0.com` (for example acme.eu.auth0.com).

Get the credentials first: [Auth0 docs](https://auth0.com/docs/api/management/v2).

## Use it

`npm install auth0`, then:

```ts
import { ManagementClient } from 'auth0';

// payload: { "domain": "acme.eu.auth0.com" }
export async function run(payload, ctx) {
  const auth0 = new ManagementClient({
    domain: payload.domain,
    clientId: ctx.secrets.AUTH0_CLIENT_ID,
    clientSecret: ctx.secrets.AUTH0_CLIENT_SECRET,
  });
  const users = await auth0.users.getAll({ per_page: 10 });
  return { emails: users.data.map((u) => u.email) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Access review.** List users and their last sign-in, and write them to [`google-sheets`](../google-sheets/README.md).
- **Offboarding.** Deactivate a user when [`bamboohr`](../bamboohr/README.md) or [`hibob`](../hibob/README.md) shows that they left.
- **Receive Auth0 events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Auth0 event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
