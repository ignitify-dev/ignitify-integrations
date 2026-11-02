# zoho-crm

> **Status:** draft — not published.

Let a task read and write Zoho CRM records.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Zoho CRM with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add zoho-crm --task my-task
ignitify secret:set ZOHO_CLIENT_ID --stdin
ignitify secret:set ZOHO_CLIENT_SECRET --stdin
ignitify secret:set ZOHO_REFRESH_TOKEN --stdin
```

The plan adds the secret names `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` and an egress network limited to `accounts.zoho.com`, `www.zohoapis.com`. **You add** one more host to `execution.network.egress_allow`, because it is different for every tenant: outside the US data centre, your hosts instead: for example accounts.zoho.eu and www.zohoapis.eu.

Get the credentials first: [Zoho CRM docs](https://www.zoho.com/crm/developer/docs/api/v7/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "module": "Leads" }
export async function run(payload, ctx) {
  const tokenRes = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ctx.secrets.ZOHO_CLIENT_ID,
      client_secret: ctx.secrets.ZOHO_CLIENT_SECRET,
      refresh_token: ctx.secrets.ZOHO_REFRESH_TOKEN,
    }),
  });
  const { access_token } = await tokenRes.json();
  const res = await fetch(`https://www.zohoapis.com/crm/v7/${payload.module}?fields=id&per_page=10`, {
    headers: { Authorization: `Zoho-oauthtoken ${access_token}` },
  });
  if (!res.ok) throw new Error(`Zoho CRM answered ${res.status}`);
  return { ids: (await res.json()).data.map((r) => r.id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Enrich records.** Read new records, classify them with [`openai`](../openai/README.md) or [`anthropic`](../anthropic/README.md), and write the label back.
- **Push leads in.** Create a record for each new [`typeform`](../typeform/README.md) response.
- **Report to the team.** Post a short pipeline summary to [`slack`](../slack/README.md).
- **Receive Zoho CRM events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Zoho CRM event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
