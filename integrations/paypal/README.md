# paypal

> **Status:** draft — not published.

Let a task create orders, capture payments and read transactions in PayPal.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call PayPal with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add paypal --task my-task
ignitify secret:set PAYPAL_CLIENT_ID --stdin
ignitify secret:set PAYPAL_CLIENT_SECRET --stdin
```

The plan adds the secret names `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and an egress network limited to `api-m.paypal.com`, `api-m.sandbox.paypal.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [PayPal docs](https://developer.paypal.com/api/rest/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "amount": "10.00", "currency": "USD" }
export async function run(payload, ctx) {
  const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.PAYPAL_CLIENT_ID}:${ctx.secrets.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  const { access_token } = await tokenRes.json();
  const res = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: payload.currency, value: payload.amount } }],
    }),
  });
  if (!res.ok) throw new Error(`PayPal answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Daily revenue report.** List yesterday's payments, add them up, and post the total to [`slack`](../slack/README.md).
- **Book payments.** Create the matching invoice or payment in [`quickbooks`](../quickbooks/README.md) or [`xero`](../xero/README.md).
- **Mail a receipt.** Send it with [`sendgrid`](../sendgrid/README.md) or [`resend`](../resend/README.md) after a payment succeeds.
- **Receive PayPal events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a PayPal event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
