# twilio

> **Status:** draft — not published.

Let a task send SMS and start voice calls through Twilio.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Twilio with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add twilio --task my-task
ignitify secret:set TWILIO_ACCOUNT_SID --stdin
ignitify secret:set TWILIO_AUTH_TOKEN --stdin
```

The plan adds the secret names `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and an egress network limited to `api.twilio.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Twilio docs](https://www.twilio.com/docs/messaging/quickstart).

## Use it

`npm install twilio`, then:

```ts
import twilio from 'twilio';

// payload: { "to": "+15551234567", "from": "+15557654321", "body": "Run failed" }
export async function run(payload, ctx) {
  const client = twilio(ctx.secrets.TWILIO_ACCOUNT_SID, ctx.secrets.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({ to: payload.to, from: payload.from, body: payload.body });
  return { sid: message.sid };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Wake a person when a run fails.** Send an SMS from the `catch` block of a long task.
- **Send one message for each row.** Read numbers and texts from [`airtable`](../airtable/README.md) and send them one by one.
- **Pick the channel.** Post to [`slack`](../slack/README.md) for routine news; send an SMS only for failures.
- **Receive Twilio events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Twilio event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
