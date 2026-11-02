# Guide: build tasks on ignitify

> **Status:** chapters 4, 6 and 7 are written. The others are planned.

This guide is for tenants. It shows how to build a task on ignitify, and how to use integrations to build complex tasks. Each chapter ends with a task that runs.

| #   | Chapter                                             | Purpose                                                                                                                       |
| :-- | :-------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Your first task                                     | Write `run(payload, ctx)`, deploy it, run it, read the result and the logs                                                    |
| 2   | Secrets                                             | Declare a secret name in `task.yaml`, set its value, read it from `ctx.secrets`, and keep it out of logs and errors           |
| 3   | Network and egress                                  | Pick a network type; list the hosts a task may reach; why a missing host blocks the connection                                |
| 4   | [Inbound and webhooks](04-inbound-and-webhooks.md)  | A long-running bidirectional task that serves HTTPS routes and receives webhooks while it runs                                |
| 5   | Results above 10 KiB and progress                   | Stream progress with `ctx.chunk`, report metrics, and return a link instead of a large result                                 |
| 6   | [Use an integration](06-use-an-integration.md)      | `integration:add`, read the plan, add the "you add" lines, `task:validate`, and remove it with `npm uninstall`                |
| 7   | [Combine integrations](07-combine-integrations.md)  | `stream` + `s3-storage`: stream live, then store the recording and return a link                                              |
| 8   | A vendor's official SDK with an OAuth refresh token | Keep the refresh token as a secret, let the SDK get short-lived tokens, and list the hosts it calls                           |
| 9   | System packages                                     | Run an open-source tool as a separate process; pick a preset that fits                                                        |
| 10  | Test locally                                        | Test the pure parts with no network; fake `ctx`; run a contract test against a local server                                   |
| 11  | Limits and what is not possible yet                 | The 10 KiB payload, no state between runs, no run started from a provider event, no stable egress IP — and what to do instead |
