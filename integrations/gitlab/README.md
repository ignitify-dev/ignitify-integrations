# gitlab

> **Status:** draft — not published.

Let a task work with GitLab issues, merge requests and pipelines.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call GitLab with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add gitlab --task my-task
ignitify secret:set GITLAB_TOKEN --stdin
```

The plan adds the secret names `GITLAB_TOKEN` and an egress network limited to `gitlab.com`. **You add** one more host to `execution.network.egress_allow`, because it is different for every tenant: self-managed only: the host of your GitLab instance.

Get the credentials first: [GitLab docs](https://docs.gitlab.com/api/rest/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "project": "acme/app", "title": "Nightly run failed" }
export async function run(payload, ctx) {
  const res = await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(payload.project)}/issues`, {
    method: 'POST',
    headers: { 'PRIVATE-TOKEN': ctx.secrets.GITLAB_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: payload.title }),
  });
  if (!res.ok) throw new Error(`GitLab answered ${res.status}`);
  return { iid: (await res.json()).iid };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Repository report.** Count open pull requests or failed pipelines and post the list to [`slack`](../slack/README.md).
- **Keep build output.** Upload artefacts with [`s3-storage`](../s3-storage/README.md) and link them in an issue or release.
- **Track errors.** Open an issue for each new [`sentry`](../sentry/README.md) issue above a threshold.
- **Receive GitLab events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a GitLab event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
