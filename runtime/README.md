# @ignitify-integrations/runtime

Zero-dependency helpers that every ignitify integration uses at run time, inside a task.

| Export                          | What                                                                                                            |
| :------------------------------ | :-------------------------------------------------------------------------------------------------------------- |
| `TaskCtx`                       | Type of the `ctx` a Node task receives: `secrets`, `chunk`, `ready`, `metric`, `callback`. Logs go to `console` |
| `Result`, `ok`, `err`, `unwrap` | The one result type: a discriminated union, so a caller must check `ok`                                         |
| `readSecret(ctx, name)`         | Read a secret, or get a message that says how to set it. Never puts a secret value in an error                  |
| `SECRET_NAME_PATTERN`           | The secret name rule; the manifest schema uses its source                                                       |
| `ROUTE_PREFIX_PATTERN`          | The inbound route rule of the platform, shared by integrations and the manifest schema                          |

No dependencies, so it adds nothing to a task image but its own few kilobytes.
