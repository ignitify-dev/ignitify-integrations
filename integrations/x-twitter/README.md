# x-twitter

> **Status:** draft — not published.

Let a task post to X and read posts and mentions.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call X (Twitter) with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add x-twitter --task my-task
ignitify secret:set X_API_KEY --stdin
ignitify secret:set X_API_SECRET --stdin
ignitify secret:set X_ACCESS_TOKEN --stdin
ignitify secret:set X_ACCESS_TOKEN_SECRET --stdin
```

The plan adds the secret names `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` and an egress network limited to `api.x.com`, `api.twitter.com`, `upload.twitter.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [X (Twitter) docs](https://docs.x.com/x-api/getting-started/about-x-api).

## Use it

`npm install oauth-1.0a`, then:

```ts
import OAuth from 'oauth-1.0a';
import { createHmac } from 'node:crypto';

// payload: { "text": "The weekly report is out." }
export async function run(payload, ctx) {
  const s = ctx.secrets;
  const oauth = new OAuth({
    consumer: { key: s.X_API_KEY, secret: s.X_API_SECRET },
    signature_method: 'HMAC-SHA1',
    hash_function: (base, key) => createHmac('sha1', key).update(base).digest('base64'),
  });
  const request = { url: 'https://api.x.com/2/tweets', method: 'POST' };
  const auth = oauth.toHeader(oauth.authorize(request, { key: s.X_ACCESS_TOKEN, secret: s.X_ACCESS_TOKEN_SECRET }));
  const res = await fetch(request.url, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: payload.text }),
  });
  if (!res.ok) throw new Error(`X answered ${res.status}`);
  return { id: (await res.json()).data.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Post when content is ready.** Publish a post at the end of the run that made the content.
- **Write the post with a model.** Draft the text with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), then publish it.
- **Weekly reach report.** Read the numbers and append a row to [`google-sheets`](../google-sheets/README.md).
- **Receive X (Twitter) events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a X (Twitter) event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- X API access tiers limit how many posts and reads an app may make each month.
