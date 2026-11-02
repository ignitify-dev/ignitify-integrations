# Guide: integrations in ignitify tasks

This guide is for tenants. It covers what the integration store adds: receiving requests in a task, adding an integration, and combining several in one task. Each chapter ends with code that runs.

For the basics of ignitify itself (your first task, secrets, network, progress, presets, testing and limits), read the platform's own docs on [ignitify.dev](https://ignitify.dev).

| Chapter                                         | Purpose                                                                                                        |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| [Inbound and webhooks](inbound-and-webhooks.md) | A long-running bidirectional task that serves HTTPS routes and receives webhooks while it runs                 |
| [Use an integration](use-an-integration.md)     | `integration:add`, read the plan, add the "you add" lines, `task:validate`, and remove it with `npm uninstall` |
| [Combine integrations](combine-integrations.md) | `stream` + `s3-storage`: stream live, then store the recording and return a link                               |
