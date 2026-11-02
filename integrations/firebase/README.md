# firebase

> **Status:** draft — not published.

Let a task read and write Firestore and send push messages with Firebase.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Firebase with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add firebase --task my-task
ignitify secret:set FIREBASE_SERVICE_ACCOUNT_KEY --stdin
```

The plan adds the secret names `FIREBASE_SERVICE_ACCOUNT_KEY` and an egress network limited to `oauth2.googleapis.com`, `accounts.google.com`, `firestore.googleapis.com`, `fcm.googleapis.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Firebase docs](https://firebase.google.com/docs/admin/setup).

## Use it

`npm install firebase-admin`, then:

```ts
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// payload: { "collection": "runs", "doc": { "status": "ok" } }
export async function run(payload, ctx) {
  const app = initializeApp({ credential: cert(JSON.parse(ctx.secrets.FIREBASE_SERVICE_ACCOUNT_KEY)) });
  const ref = await getFirestore(app).collection(payload.collection).add(payload.doc);
  return { id: ref.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Store task output.** Write one row for each run: status, counts, a link.
- **A work queue.** Read the next open job, do the work, and mark it done.
- **Big files.** Keep them in [`s3-storage`](../s3-storage/README.md) and store only the link in a row.

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The secret holds a whole service-account key (JSON).
