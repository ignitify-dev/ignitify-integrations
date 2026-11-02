# workday

> **Status:** draft — not published.

Let a task read Workday workers and organizations through the REST API.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Workday with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add workday --task my-task
ignitify secret:set WORKDAY_CLIENT_ID --stdin
ignitify secret:set WORKDAY_CLIENT_SECRET --stdin
ignitify secret:set WORKDAY_REFRESH_TOKEN --stdin
```

The plan adds the secret names `WORKDAY_CLIENT_ID`, `WORKDAY_CLIENT_SECRET`, `WORKDAY_REFRESH_TOKEN` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your tenant REST host, for example wd2-impl-services1.workday.com.

Get the credentials first: [Workday docs](https://community.workday.com/sites/default/files/file-hosting/restapi/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "host": "wd2-impl-services1.workday.com", "tenant": "acme" }
export async function run(payload, ctx) {
  const tokenRes = await fetch(`https://${payload.host}/ccx/oauth2/${payload.tenant}/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: ctx.secrets.WORKDAY_REFRESH_TOKEN,
      client_id: ctx.secrets.WORKDAY_CLIENT_ID,
      client_secret: ctx.secrets.WORKDAY_CLIENT_SECRET,
    }),
  });
  const { access_token } = await tokenRes.json();
  const res = await fetch(`https://${payload.host}/ccx/api/v1/${payload.tenant}/workers?limit=10`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`Workday answered ${res.status}`);
  return { total: (await res.json()).total };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **New-hire checklist.** Read new employees, create their onboarding tasks in [`asana`](../asana/README.md) or [`jira`](../jira/README.md), and post a welcome to [`slack`](../slack/README.md).
- **Recruiting digest.** Count candidates for each stage and post the numbers to [`microsoft-teams`](../microsoft-teams/README.md) or [`slack`](../slack/README.md).
- **Access follow-up.** When a person leaves, deactivate them in [`okta`](../okta/README.md) or [`microsoft-entra-id`](../microsoft-entra-id/README.md).
- **Receive Workday events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Workday event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
- The platform has no fixed egress IP. An account that allows only listed source IPs refuses the task.
