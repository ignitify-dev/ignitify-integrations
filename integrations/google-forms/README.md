# google-forms

> **Status:** draft — not published.

Let a task read Google Forms responses.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Google Forms with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add google-forms --task my-task
ignitify secret:set GOOGLE_CLIENT_ID --stdin
ignitify secret:set GOOGLE_CLIENT_SECRET --stdin
ignitify secret:set GOOGLE_REFRESH_TOKEN --stdin
```

The plan adds the secret names `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and an egress network limited to `oauth2.googleapis.com`, `forms.googleapis.com`. There is nothing for you to add.

Get the credentials first: [Google Forms docs](https://developers.google.com/workspace/forms/api/quickstart/nodejs).

## Use it

`npm install @googleapis/forms`, then:

```ts
import { auth, forms } from '@googleapis/forms';

export async function run(payload, ctx) {
  const client = new auth.OAuth2(ctx.secrets.GOOGLE_CLIENT_ID, ctx.secrets.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: ctx.secrets.GOOGLE_REFRESH_TOKEN });
  const api = forms({ version: 'v1', auth: client });
  // payload: { "form_id": "..." }
  const { data } = await api.forms.responses.list({ formId: payload.form_id });
  return { count: data.responses?.length ?? 0 };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Responses to a sheet.** Copy new responses to [`google-sheets`](../google-sheets/README.md).
- **Route responses.** Create a [`hubspot`](../hubspot/README.md) contact or a [`linear`](../linear/README.md) issue for each response.
- **Receive Google Forms events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Google Forms event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
