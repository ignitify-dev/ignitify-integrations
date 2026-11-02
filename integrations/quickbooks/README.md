# quickbooks

> **Status:** draft — not published.

Let a task read and write QuickBooks Online invoices, customers and payments.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call QuickBooks Online with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add quickbooks --task my-task
ignitify secret:set QUICKBOOKS_CLIENT_ID --stdin
ignitify secret:set QUICKBOOKS_CLIENT_SECRET --stdin
ignitify secret:set QUICKBOOKS_REFRESH_TOKEN --stdin
```

The plan adds the secret names `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REFRESH_TOKEN` and an egress network limited to `oauth.platform.intuit.com`, `quickbooks.api.intuit.com`, `sandbox-quickbooks.api.intuit.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [QuickBooks Online docs](https://developer.intuit.com/app/developer/qbo/docs/get-started).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "realm_id": "1234567890", "query": "select * from Invoice maxresults 10" }
export async function run(payload, ctx) {
  const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.QUICKBOOKS_CLIENT_ID}:${ctx.secrets.QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: ctx.secrets.QUICKBOOKS_REFRESH_TOKEN }),
  });
  const { access_token } = await tokenRes.json();
  const url = `https://quickbooks.api.intuit.com/v3/company/${payload.realm_id}/query?query=${encodeURIComponent(payload.query)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`QuickBooks answered ${res.status}`);
  return { count: (await res.json()).QueryResponse.Invoice?.length ?? 0 };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Invoices from payments.** Read paid charges from [`stripe`](../stripe/README.md) and create the invoices here.
- **Month-end export.** Run a report, upload the CSV with [`s3-storage`](../s3-storage/README.md), and mail the link with [`postmark`](../postmark/README.md).
- **Receive QuickBooks Online events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a QuickBooks Online event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
- QuickBooks may return a new refresh token on a refresh. The platform keeps no state between runs, so the task cannot save it: update the secret when the old token stops working. A platform connection store would fix this; it does not exist yet.
