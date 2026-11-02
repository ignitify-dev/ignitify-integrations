# 4. Inbound and webhooks

A task can receive HTTPS requests while it runs: webhooks from a vendor, or a small page for people to open. It needs a long run and a bidirectional network. The [`stream`](../../integrations/stream/README.md) integration works this way.

## What you can and cannot do

- You **can** receive requests while a run is alive: start a long run, give its address to the vendor, and handle each event as it arrives.
- You **cannot** start a new run from a vendor event yet. When the run ends, the address stops answering.
- Inbound is **HTTPS only**. Other protocols cannot reach the task.

## The settings

```yaml
execution:
  duration: long
  interaction: continuous # only needed if you send progress with ctx.chunk
  network:
    type: bidirectional
    inbound_port: 8080
    inbound_routes:
      - prefix: /hooks/
    inbound_max_concurrent: 8 # optional: requests handled at the same time
```

- `inbound_port` is the port your code listens on: 1024 to 65535.
- A route prefix starts and ends with `/`, uses lower case, and is not `/` alone. A prefix at or under `/__callback/` is refused: the platform uses that route itself.
- `run.timeout_sec` still stops the run, so set it to the longest time you want to listen.

## The code

```js
import { createServer } from 'node:http';

const PORT = 8080; // equals execution.network.inbound_port
const ROUTE = '/hooks/'; // equals a prefix in inbound_routes

export async function run(payload, ctx) {
  // The public address: this deployment's host, plus your route.
  const url = ctx.callback ? `${new URL(ctx.callback.url).origin}${ROUTE}` : null;
  let received = 0;

  const server = createServer((req, res) => {
    if (req.method !== 'POST' || !req.url?.startsWith(ROUTE)) return res.writeHead(404).end();
    const parts = [];
    req.on('data', (part) => parts.push(part));
    req.on('end', () => {
      const body = Buffer.concat(parts); // the raw body: check the vendor's signature on these bytes
      received += 1;
      ctx.chunk({ event: received, bytes: body.length });
      res.writeHead(204).end();
    });
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  ctx.ready(); // tell the platform the listener is up
  ctx.chunk({ status: 'listening', url });

  await new Promise((resolve) => process.once('SIGTERM', resolve)); // a cancel ends the run
  server.close();
  return { received };
}
```

1. Listen on the port, then call `ctx.ready()`.
2. Read the address from `ctx.callback.url` in every run. Do not write it into your code.
3. Give the address to the vendor: in the vendor's console, or with the vendor's API from the run itself.
4. Answer each request quickly. Do long work after the answer.

## Check that a request is real

Anyone can send a request to a public address. Use the vendor's own check: most vendors sign each webhook with a secret that you keep in `ctx.secrets`, and their SDK has a function that checks the signature. Check the **raw body**: a body that was parsed and serialised again does not match the signature.

`ctx.callback.verify` is for the platform's own callback route only, not for vendor webhooks.

## Limits

- The address works only while the run is alive.
- `inbound_max_concurrent` limits the requests handled at the same time; raise it if you need more.
- Many viewers or a high event rate need a service built for that load (a queue, a CDN), not one task.
