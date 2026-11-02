# 7. Combine integrations

One task can use several integrations. Each `integration:add` adds its settings to the same `task.yaml`: secrets and hosts are joined, and the network type and preset are raised to the larger need. This chapter streams a video live with [`stream`](../../integrations/stream/README.md), then stores the recording with [`s3-storage`](../../integrations/s3-storage/README.md) and returns one link.

## Add both

```bash
ignitify integration:add stream --task live
ignitify integration:add s3-storage --task live
ignitify secret:set S3_ACCESS_KEY_ID --stdin
ignitify secret:set S3_SECRET_ACCESS_KEY --stdin
```

Then add the hosts from the "you add" lines to `execution.network.egress_allow`: your bucket host, and the source host if the source is an `https://` URL.

`stream` needs a bidirectional network, a long run and at least `std.medium`; `s3-storage` needs egress. The task gets the larger of each: bidirectional, long, `std.medium`.

## Prepare the bucket

The player fetches the video segments by plain URL, so one playable link needs a prefix that allows **public read** (for example `rec/`). How you allow it depends on your provider; see its docs. With a private bucket, you can only return one presigned link per file, and the playlist alone does not play.

The playlist link plays directly in Safari and in HLS players. To play it in a web page on another site, the bucket also needs CORS for that site.

## The code

```js
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stream } from '@ignitify-integrations/stream';
import { storage } from '@ignitify-integrations/s3-storage';

const HLS_DIR = join(process.env.HOME || '/mnt/scratch', 'hls'); // where stream keeps the playlist and segments
const PLAYLIST = 'index.m3u8';

export async function run(payload, ctx) {
  // 1. Stream live; 'stop' returns when ffmpeg ends and keeps the files.
  const live = await stream(ctx, { source: payload.url, seconds: payload.seconds, after: 'stop' });
  if (live.stage !== 'streamed') return live; // cancelled before the stream started: nothing to store

  // 2. Upload every segment under one prefix, keeping its file name.
  const store = storage(ctx, { bucket: payload.bucket, region: payload.region });
  const prefix = `rec/${Date.now()}`;
  const files = await readdir(HLS_DIR);
  for (const file of files.filter((name) => name !== PLAYLIST)) {
    await store.put(join(HLS_DIR, file), { key: `${prefix}/${file}`, contentType: 'video/mp2t' });
  }

  // 3. Upload the playlist last and return its link.
  const recording = await store.putAndLink(join(HLS_DIR, PLAYLIST), {
    key: `${prefix}/${PLAYLIST}`,
    contentType: 'application/vnd.apple.mpegurl',
  });
  return { watched: live.watch, recording };
}
```

## Grow it

- **Tell people first.** Send the live link before the stream starts, for example with [`telegram`](../../integrations/telegram/README.md); use `startDelaySec` to give them time to join.
- **Keep files between runs.** One run `put`s with a fixed key; a later run `get`s it.
