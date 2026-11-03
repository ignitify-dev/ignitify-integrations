---
'@ignitify-integrations/stream': patch
---

Fix: `integration:add stream` wrote `inbound_max_concurrent: 16`, and the platform refuses a run whose value is above the plan limit (2 to 25 on most plans). The manifest no longer declares it, so the task takes the plan limit. README: how viewers share that limit.
