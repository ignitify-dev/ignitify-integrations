# okta

> **Status:** draft — not published.

Let a task read and manage Okta users and groups.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Okta with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add okta --task my-task
ignitify secret:set OKTA_API_TOKEN --stdin
```

The plan adds the secret names `OKTA_API_TOKEN` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your Okta org host: `<org>.okta.com` (or your custom domain).

Get the credentials first: [Okta docs](https://developer.okta.com/docs/reference/core-okta-api/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "org": "acme" }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.org}.okta.com/api/v1/users?limit=10`, {
    headers: { Authorization: `SSWS ${ctx.secrets.OKTA_API_TOKEN}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Okta answered ${res.status}`);
  return { logins: (await res.json()).map((u) => u.profile.login) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Access review.** List users and their last sign-in, and write them to [`google-sheets`](../google-sheets/README.md).
- **Offboarding.** Deactivate a user when [`bamboohr`](../bamboohr/README.md) or [`hibob`](../hibob/README.md) shows that they left.
- **Receive Okta events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Okta event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The platform has no fixed egress IP. An account that allows only listed source IPs refuses the task.
