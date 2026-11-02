# mailchimp

> **Status:** draft — not published.

Let a task manage Mailchimp audiences and campaigns.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Mailchimp with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add mailchimp --task my-task
ignitify secret:set MAILCHIMP_API_KEY --stdin
```

The plan adds the secret names `MAILCHIMP_API_KEY` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your data-centre host, the suffix of the API key: `<dc>.api.mailchimp.com` (for example us21.api.mailchimp.com).

Get the credentials first: [Mailchimp docs](https://mailchimp.com/developer/marketing/guides/quick-start/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "dc": "us21", "list_id": "abc123", "email": "a@example.com" }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.dc}.api.mailchimp.com/3.0/lists/${payload.list_id}/members`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`task:${ctx.secrets.MAILCHIMP_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_address: payload.email, status: 'subscribed' }),
  });
  if (!res.ok) throw new Error(`Mailchimp answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **Sync an audience.** Add new [`hubspot`](../hubspot/README.md) contacts to a list here.
- **Daily spend report.** Read yesterday's numbers and append a row to [`google-sheets`](../google-sheets/README.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
