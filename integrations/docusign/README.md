# docusign

> **Status:** draft — not published.

Let a task send documents for signature and read envelope status in Docusign.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Docusign with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add docusign --task my-task
ignitify secret:set DOCUSIGN_INTEGRATION_KEY --stdin
ignitify secret:set DOCUSIGN_USER_ID --stdin
ignitify secret:set DOCUSIGN_PRIVATE_KEY --stdin
```

The plan adds the secret names `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_PRIVATE_KEY` and an egress network limited to `account.docusign.com`, `account-d.docusign.com`, `demo.docusign.net`. **You add** one more host to `execution.network.egress_allow`, because it is different for every tenant: your account base URI host from userinfo, for example na3.docusign.net.

Get the credentials first: [Docusign docs](https://developers.docusign.com/platform/auth/jwt/).

## Use it

`npm install docusign-esign`, then:

```ts
import docusign from 'docusign-esign';

// payload: { "base_uri": "https://na3.docusign.net", "account_id": "...", "from_date": "2026-10-01" }
export async function run(payload, ctx) {
  const s = ctx.secrets;
  const client = new docusign.ApiClient();
  client.setOAuthBasePath('account.docusign.com');
  const { body } = await client.requestJWTUserToken(
    s.DOCUSIGN_INTEGRATION_KEY,
    s.DOCUSIGN_USER_ID,
    ['signature', 'impersonation'],
    Buffer.from(s.DOCUSIGN_PRIVATE_KEY),
    3600,
  );
  const url = `${payload.base_uri}/restapi/v2.1/accounts/${payload.account_id}/envelopes?from_date=${payload.from_date}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${body.access_token}` } });
  if (!res.ok) throw new Error(`Docusign answered ${res.status}`);
  return { count: (await res.json()).resultSetSize };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Send a contract from a deal.** Read the deal from [`hubspot`](../hubspot/README.md) or [`salesforce`](../salesforce/README.md), then send the document for signature.
- **Keep signed copies.** Download the signed PDF and upload it with [`s3-storage`](../s3-storage/README.md).
- **Receive Docusign events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Docusign event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
