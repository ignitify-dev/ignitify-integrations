# s3-storage

Let a task return files bigger than 10 KiB: upload a file from the scratch disk to an S3-compatible bucket and return a presigned link (a few hundred bytes).

It works with AWS S3, Cloudflare R2, Backblaze B2 and MinIO.

## Add it

```bash
ignitify integration:add s3-storage --task report
ignitify secret:set S3_ACCESS_KEY_ID --stdin
ignitify secret:set S3_SECRET_ACCESS_KEY --stdin
```

The plan adds the two secret names and an egress network. **You add one host** to `execution.network.egress_allow`, because it is different for every tenant:

| Provider         | Host to add                                                                    |
| :--------------- | :----------------------------------------------------------------------------- |
| AWS S3           | `<bucket>.s3.<region>.amazonaws.com`                                           |
| Another provider | the host of your endpoint, for example `<account-id>.r2.cloudflarestorage.com` |

With an endpoint, the package uses path-style addressing, so one host covers all your buckets there. Create the bucket and an access key in your provider's console first.

## Use it

```ts
import { storage } from '@ignitify-integrations/s3-storage';

export async function run(payload, ctx) {
  const file = await buildReport(payload); // a path on the scratch disk
  const store = storage(ctx, { bucket: 'acme-reports', region: 'eu-west-1' });
  const url = await store.putAndLink(file, { expiresSec: 86400, contentType: 'application/pdf' });
  return { url };
}
```

| Call                                                                | Does                                                                                            |
| :------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------- |
| `storage(ctx, { bucket, region, endpoint?, credentials? })`         | Checks the options and reads the two secrets. Throws a clear error when one is wrong or missing |
| `put(filePath, { key?, contentType? })` → `{ key, size }`           | Streams the file to the bucket, without reading it into memory                                  |
| `putAndLink(filePath, { key?, contentType?, expiresSec? })` → `url` | `put`, then a presigned GET link                                                                |
| `get(key, filePath)`                                                | Streams an object to a file                                                                     |

The default key is `<random id>/<file name>`, so two runs never overwrite each other's file.

For a provider other than AWS, add `endpoint`, for example `endpoint: 'https://<account-id>.r2.cloudflarestorage.com'` with `region: 'auto'`.

## Grow your task

- **Many files from one run.** Call `putAndLink` once per file and return a list of links.
- **Hand files between runs.** One run `put`s with a fixed `key`; a later run `get`s the same key. This is a simple way to keep data between runs.
- **Record a stream.** With [`stream`](../stream/README.md), upload the recording when the stream ends. One playable link needs a public-read prefix; see "Keep the recording" in the `stream` README.
- **Send the link to people.** With [`telegram`](../telegram/README.md), send the link in a message.
- **A second account.** Declare two more secret names in `task.yaml` (for example `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`) and pass them:

  ```ts
  const backup = storage(ctx, {
    bucket: 'acme-backup',
    region: 'eu-west-1',
    credentials: {
      accessKeyId: ctx.secrets.BACKUP_S3_ACCESS_KEY_ID,
      secretAccessKey: ctx.secrets.BACKUP_S3_SECRET_ACCESS_KEY,
    },
  });
  ```

  Add that bucket's host too, if it is different.

## Limits

- One upload is at most **5 GiB**. Larger files need a multipart upload, which this package does not do yet.
- A link is valid for **1 second to 7 days**. The default is 1 hour.
- The endpoint must use `https`. `insecureHttp: true` is for a local test server only.
- Bucket names with dots do not work on AWS here: the SDK then sends them to a different host.
- Errors and logs never contain the access key or the secret key.
