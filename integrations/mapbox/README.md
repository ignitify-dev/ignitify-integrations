# mapbox

> **Status:** draft — not published.

Let a task geocode addresses, compute routes and render static maps with Mapbox.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Mapbox with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add mapbox --task my-task
ignitify secret:set MAPBOX_ACCESS_TOKEN --stdin
```

The plan adds the secret names `MAPBOX_ACCESS_TOKEN` and an egress network limited to `api.mapbox.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Mapbox docs](https://docs.mapbox.com/api/overview/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "q": "Brandenburger Tor, Berlin" }
export async function run(payload, ctx) {
  const query = new URLSearchParams({ q: payload.q, limit: '1', access_token: ctx.secrets.MAPBOX_ACCESS_TOKEN });
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${query}`);
  if (!res.ok) throw new Error(`Mapbox answered ${res.status}`);
  return { coordinates: (await res.json()).features[0]?.geometry.coordinates };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Geocode a list.** Read addresses from [`google-sheets`](../google-sheets/README.md) or [`airtable`](../airtable/README.md) and write the coordinates back.
- **Distances for a plan.** Compute travel times between stops and return the order.

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The token is in the request URL. Do not log request URLs or put them in errors.
