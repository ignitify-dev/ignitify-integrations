# github

> **Status:** draft — not published.

Let a task work with GitHub issues, pull requests, releases and repository files.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call GitHub with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add github --task my-task
ignitify secret:set GITHUB_TOKEN --stdin
```

The plan adds the secret names `GITHUB_TOKEN` and an egress network limited to `api.github.com`, `uploads.github.com`. There is nothing for you to add.

Get the credentials first: [GitHub docs](https://docs.github.com/rest/authentication/authenticating-to-the-rest-api).

## Use it

`npm install @octokit/rest`, then:

```ts
import { Octokit } from '@octokit/rest';

// payload: { "owner": "acme", "repo": "app", "title": "Nightly run failed" }
export async function run(payload, ctx) {
  const github = new Octokit({ auth: ctx.secrets.GITHUB_TOKEN });
  const { data } = await github.rest.issues.create({ owner: payload.owner, repo: payload.repo, title: payload.title });
  return { number: data.number, url: data.html_url };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Repository report.** Count open pull requests or failed pipelines and post the list to [`slack`](../slack/README.md).
- **Keep build output.** Upload artefacts with [`s3-storage`](../s3-storage/README.md) and link them in an issue or release.
- **Track errors.** Open an issue for each new [`sentry`](../sentry/README.md) issue above a threshold.
- **Receive GitHub events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a GitHub event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
