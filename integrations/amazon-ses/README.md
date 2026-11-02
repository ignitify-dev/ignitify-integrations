# amazon-ses

> **Status:** draft — not published.

Let a task send email through Amazon Simple Email Service.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Amazon SES with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add amazon-ses --task my-task
ignitify secret:set SES_ACCESS_KEY_ID --stdin
ignitify secret:set SES_SECRET_ACCESS_KEY --stdin
```

The plan adds the secret names `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: the SES host of your region: `email.<region>.amazonaws.com` (for example email.eu-west-1.amazonaws.com).

Get the credentials first: [Amazon SES docs](https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html).

## Use it

`npm install @aws-sdk/client-sesv2`, then:

```ts
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

// payload: { "region": "eu-west-1", "to": "a@example.com", "from": "reports@example.com", "subject": "Report", "text": "It is ready." }
export async function run(payload, ctx) {
  const ses = new SESv2Client({
    region: payload.region,
    credentials: { accessKeyId: ctx.secrets.SES_ACCESS_KEY_ID, secretAccessKey: ctx.secrets.SES_SECRET_ACCESS_KEY },
  });
  const sent = await ses.send(
    new SendEmailCommand({
      FromEmailAddress: payload.from,
      Destination: { ToAddresses: [payload.to] },
      Content: { Simple: { Subject: { Data: payload.subject }, Body: { Text: { Data: payload.text } } } },
    }),
  );
  return { id: sent.MessageId };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **Mail the report when a run ends.** Build the text in `run()` and send it as the last step.
- **Send a link, not an attachment.** Upload a big file with [`s3-storage`](../s3-storage/README.md) and put the presigned link in the mail.
- **Mail a list.** Read the recipients from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md), and send one mail to each. Wait between sends.
- **Receive Amazon SES events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Amazon SES event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
