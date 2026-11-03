# stream

Let a task serve a live audio or video stream that viewers open in any browser. ffmpeg does the media work; this package does the platform plumbing (server, player page, viewer link, progress, stop on cancel).

## Add it

```bash
ignitify integration:add stream --task live
```

The plan line says `runs ffmpeg`. The plan adds `ffmpeg` to `build.system_packages`, a bidirectional network with port 8080 and the route `/live/`, a long continuous execution, and at least the `std.medium` preset.

**You add one host** when the source is an `https://` URL: the source host (for example `raw.githubusercontent.com`) in `execution.network.egress_allow`. A file on the VM needs no host.

## Use it

```ts
import { stream } from '@ignitify-integrations/stream';

export async function run(payload, ctx) {
  return stream(ctx, { source: payload.url, seconds: payload.seconds });
}
```

The first chunk the caller gets is `{ status: 'live', watch, playlist }`. A viewer opens `watch` (the deployment's public host + `/live/`). Then progress chunks follow: `{ status: 'streaming', time_s, of_s, speed }`, at most every 2 s.

| Option          | Default              | Meaning                                                                                                                       |
| :-------------- | :------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `source`        | —                    | `https://` URL, or an absolute file path on the VM                                                                            |
| `profile`       | `'video'`            | `'video'` (x264 + AAC) or `'audio'` (AAC only)                                                                                |
| `seconds`       | whole source         | Stop after this many seconds; `run.timeout_sec` is the safety stop                                                            |
| `height`        | 480                  | Output height in pixels (1–2160); ignored for `audio`                                                                         |
| `startDelaySec` | 0                    | Serve the player first, start the stream later                                                                                |
| `after`         | `'replay'`           | `'replay'`: keep serving the recording until cancel (or `lingerSec`). `'stop'`: return when ffmpeg ends                       |
| `lingerSec`     | none                 | With `replay`: stop this long after the end                                                                                   |
| `route`, `port` | `'/live/'`, 8080     | Must equal `inbound_routes` and `inbound_port` in `task.yaml`                                                                 |
| `ffmpegArgs`    | —                    | `(defaults, paths) => args`: change the encoder arguments. Keep `-progress pipe:1` and write the playlist to `paths.playlist` |
| `onProgress`    | —                    | Called for every ffmpeg progress report                                                                                       |
| `signal`        | `SIGTERM` / `SIGINT` | An `AbortSignal` that stops the stream                                                                                        |

The result is `{ success: true, stage: 'streamed', cancelled, watch, streamed_s, height, wall_ms }`, or `{ success: true, cancelled: true, stage: 'before-stream' }` when it is stopped during the start delay. A failed ffmpeg run throws, with the end of ffmpeg's error output in the message.

## Grow your task

- **A radio-style stream.** Use `profile: 'audio'`.
- **Give viewers time to join.** Use `startDelaySec`, and send the link first: `watchUrl(ctx)` returns it before the stream starts (for example, in a chat message).
- **Keep the recording.** Use `after: 'stop'`; the playlist and segments stay in `$HOME/hls` until the next stream starts. To return one playable link, upload each segment with [`s3-storage`](https://github.com/ignitify-dev/ignitify-integrations/tree/master/integrations/s3-storage)'s `put` under one prefix, keeping its file name (`key: 'rec/<file>'`), then the playlist with `putAndLink` and the same prefix, and return that link. The player fetches the segments by plain URL, so the prefix must allow public read. With a private bucket, return one link per file.
- **Your own encoding.** Change bitrate, codec or filters with `ffmpegArgs`; the package still runs the server and the progress.
- **React to progress.** Use `onProgress`, for example to stop early on a condition with your own `AbortController` and `signal`.

## Limits

- Serves **HLS over HTTPS** only, with a few seconds of delay. It reads the source over HTTPS or from disk.
- **No ingest.** Inbound is HTTPS only, so RTMP, SRT and WebRTC cannot reach the task. You cannot stream from OBS into a task.
- **One stream per task, for a small audience.** Many viewers need a CDN or a media server.
- The memory need of the `audio` profile is not measured; the minimum preset stays `std.medium`.

## Licence of ffmpeg

FFmpeg is LGPL-2.1-or-later; builds with libx264 (as distribution builds are) are GPL. This package runs the OS package unmodified as a separate process and links none of it. hls.js (Apache-2.0) is an npm dependency, served from `node_modules`.
