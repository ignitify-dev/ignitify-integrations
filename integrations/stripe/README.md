# stripe

> **Status:** draft — not published.

Let a task create and read Stripe payments, customers, invoices and subscriptions.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Stripe with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add stripe --task my-task
ignitify secret:set STRIPE_SECRET_KEY --stdin
```

The plan adds the secret names `STRIPE_SECRET_KEY` and an egress network limited to `api.stripe.com`, `files.stripe.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Stripe docs](https://docs.stripe.com/keys).

## Use it

`npm install stripe`, then:

```ts
import Stripe from 'stripe';

// payload: { "email": "a@example.com" }
export async function run(payload, ctx) {
  const stripe = new Stripe(ctx.secrets.STRIPE_SECRET_KEY);
  const customer = await stripe.customers.create({ email: payload.email });
  return { id: customer.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Daily revenue report.** List yesterday's payments, add them up, and post the total to [`slack`](../slack/README.md).
- **Book payments.** Create the matching invoice or payment in [`quickbooks`](../quickbooks/README.md) or [`xero`](../xero/README.md).
- **Mail a receipt.** Send it with [`sendgrid`](../sendgrid/README.md) or [`resend`](../resend/README.md) after a payment succeeds.
- **Receive Stripe events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Stripe event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
