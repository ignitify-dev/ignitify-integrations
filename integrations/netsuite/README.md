# netsuite

> **Status:** draft — not published.

Let a task read and write NetSuite records through the REST API.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call NetSuite with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add netsuite --task my-task
ignitify secret:set NETSUITE_CONSUMER_KEY --stdin
ignitify secret:set NETSUITE_CONSUMER_SECRET --stdin
ignitify secret:set NETSUITE_TOKEN_ID --stdin
ignitify secret:set NETSUITE_TOKEN_SECRET --stdin
```

The plan adds the secret names `NETSUITE_CONSUMER_KEY`, `NETSUITE_CONSUMER_SECRET`, `NETSUITE_TOKEN_ID`, `NETSUITE_TOKEN_SECRET` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your account host: `<account-id>.suitetalk.api.netsuite.com`.

Get the credentials first: [NetSuite docs](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html).

## Use it

`npm install oauth-1.0a`, then:

```ts
import OAuth from 'oauth-1.0a';
import { createHmac } from 'node:crypto';

// payload: { "account_id": "1234567_SB1", "host": "1234567-sb1.suitetalk.api.netsuite.com" }
export async function run(payload, ctx) {
  const s = ctx.secrets;
  const oauth = new OAuth({
    consumer: { key: s.NETSUITE_CONSUMER_KEY, secret: s.NETSUITE_CONSUMER_SECRET },
    signature_method: 'HMAC-SHA256',
    hash_function: (base, key) => createHmac('sha256', key).update(base).digest('base64'),
    realm: payload.account_id,
  });
  const request = { url: `https://${payload.host}/services/rest/record/v1/customer?limit=10`, method: 'GET' };
  const auth = oauth.toHeader(oauth.authorize(request, { key: s.NETSUITE_TOKEN_ID, secret: s.NETSUITE_TOKEN_SECRET }));
  const res = await fetch(request.url, { headers: { ...auth } });
  if (!res.ok) throw new Error(`NetSuite answered ${res.status}`);
  return { ids: (await res.json()).items.map((i) => i.id) };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **Invoices from payments.** Read paid charges from [`stripe`](../stripe/README.md) and create the invoices here.
- **Month-end export.** Run a report, upload the CSV with [`s3-storage`](../s3-storage/README.md), and mail the link with [`postmark`](../postmark/README.md).
- **Receive NetSuite events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a NetSuite event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The platform has no fixed egress IP. An account that allows only listed source IPs refuses the task.
