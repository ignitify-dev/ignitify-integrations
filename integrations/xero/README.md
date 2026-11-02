# xero

> **Status:** draft — not published.

Let a task read and write Xero invoices, contacts and payments.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Xero with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add xero --task my-task
ignitify secret:set XERO_CLIENT_ID --stdin
ignitify secret:set XERO_CLIENT_SECRET --stdin
```

The plan adds the secret names `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET` and an egress network limited to `identity.xero.com`, `api.xero.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Xero docs](https://developer.xero.com/documentation/guides/oauth2/custom-connections/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "status": "AUTHORISED" }
export async function run(payload, ctx) {
  // A custom connection: client credentials, one Xero organisation.
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.XERO_CLIENT_ID}:${ctx.secrets.XERO_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  const { access_token } = await tokenRes.json();
  const res = await fetch(`https://api.xero.com/api.xro/2.0/Invoices?Statuses=${payload.status}`, {
    headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Xero answered ${res.status}`);
  return { ids: (await res.json()).Invoices.map((i) => i.InvoiceID) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Invoices from payments.** Read paid charges from [`stripe`](../stripe/README.md) and create the invoices here.
- **Month-end export.** Run a report, upload the CSV with [`s3-storage`](../s3-storage/README.md), and mail the link with [`postmark`](../postmark/README.md).
- **Receive Xero events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Xero event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The example uses a custom connection (one organisation). The standard OAuth flow rotates the refresh token on each use, and the platform keeps no state between runs, so that flow does not work in a task yet.
