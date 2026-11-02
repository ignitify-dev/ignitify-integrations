# salesforce

> **Status:** draft — not published.

Let a task read and write Salesforce records (leads, contacts, opportunities).

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Salesforce with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add salesforce --task my-task
ignitify secret:set SALESFORCE_CLIENT_ID --stdin
ignitify secret:set SALESFORCE_CLIENT_SECRET --stdin
ignitify secret:set SALESFORCE_REFRESH_TOKEN --stdin
```

The plan adds the secret names `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_REFRESH_TOKEN` and an egress network limited to `login.salesforce.com`, `test.salesforce.com`. **You add** one more host to `execution.network.egress_allow`, because it is different for every tenant: your org host, from instance_url: `<my-domain>.my.salesforce.com`.

Get the credentials first: [Salesforce docs](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "soql": "SELECT Id, Name FROM Account LIMIT 10" }
export async function run(payload, ctx) {
  const tokenRes = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ctx.secrets.SALESFORCE_CLIENT_ID,
      client_secret: ctx.secrets.SALESFORCE_CLIENT_SECRET,
      refresh_token: ctx.secrets.SALESFORCE_REFRESH_TOKEN,
    }),
  });
  if (!tokenRes.ok) throw new Error(`token request failed: ${tokenRes.status}`);
  const { access_token, instance_url } = await tokenRes.json();
  const res = await fetch(`${instance_url}/services/data/v62.0/query?q=${encodeURIComponent(payload.soql)}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`Salesforce answered ${res.status}`);
  const body = await res.json();
  return { total: body.totalSize, ids: body.records.map((r) => r.Id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Enrich records.** Read new records, classify them with [`openai`](../openai/README.md) or [`anthropic`](../anthropic/README.md), and write the label back.
- **Push leads in.** Create a record for each new [`typeform`](../typeform/README.md) response.
- **Report to the team.** Post a short pipeline summary to [`slack`](../slack/README.md).
- **Receive Salesforce events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Salesforce event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
- The platform has no fixed egress IP. An account that allows only listed source IPs refuses the task.
