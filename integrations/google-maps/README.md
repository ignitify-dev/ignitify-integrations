# google-maps

> **Status:** draft — not published.

Let a task geocode addresses, search places and compute routes with Google Maps.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Google Maps Platform with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add google-maps --task my-task
ignitify secret:set GOOGLE_MAPS_API_KEY --stdin
```

The plan adds the secret names `GOOGLE_MAPS_API_KEY` and an egress network limited to `maps.googleapis.com`, `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`. There is nothing for you to add.

Get the credentials first: [Google Maps Platform docs](https://developers.google.com/maps/get-started).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "address": "1600 Amphitheatre Parkway, Mountain View" }
export async function run(payload, ctx) {
  const query = new URLSearchParams({ address: payload.address, key: ctx.secrets.GOOGLE_MAPS_API_KEY });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query}`);
  if (!res.ok) throw new Error(`Google Maps answered ${res.status}`);
  return { location: (await res.json()).results[0]?.geometry.location };
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
- The key is in the request URL. Do not log request URLs or put them in errors.
