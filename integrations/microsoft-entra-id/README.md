# microsoft-entra-id

> **Status:** draft — not published.

Let a task read and manage Microsoft Entra ID users and groups.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Microsoft Entra ID with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add microsoft-entra-id --task my-task
ignitify secret:set MICROSOFT_TENANT_ID --stdin
ignitify secret:set MICROSOFT_CLIENT_ID --stdin
ignitify secret:set MICROSOFT_CLIENT_SECRET --stdin
```

The plan adds the secret names `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` and an egress network limited to `login.microsoftonline.com`, `graph.microsoft.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Microsoft Entra ID docs](https://learn.microsoft.com/graph/api/resources/users).

## Use it

With plain `fetch` (no package to install):

```ts
// An app-only access token on each run (client credentials).
async function graphToken(s) {
  const res = await fetch(`https://login.microsoftonline.com/${s.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: s.MICROSOFT_CLIENT_ID,
      client_secret: s.MICROSOFT_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status}`);
  return (await res.json()).access_token;
}

// payload: {}
export async function run(payload, ctx) {
  const token = await graphToken(ctx.secrets);
  const res = await fetch('https://graph.microsoft.com/v1.0/users?$top=10&$select=displayName,userPrincipalName', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Microsoft Graph answered ${res.status}`);
  return { users: (await res.json()).value.map((u) => u.userPrincipalName) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Access review.** List users and their last sign-in, and write them to [`google-sheets`](../google-sheets/README.md).
- **Offboarding.** Deactivate a user when [`bamboohr`](../bamboohr/README.md) or [`hibob`](../hibob/README.md) shows that they left.
- **Receive Microsoft Entra ID events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Microsoft Entra ID event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
