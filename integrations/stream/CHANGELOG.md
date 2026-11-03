# @ignitify-integrations/stream

## 0.1.3

### Patch Changes

- 6acf79b: Fix: `integration:add stream` wrote `inbound_max_concurrent: 16`, and the platform refuses a run whose value is above the plan limit (2 to 25 on most plans). The manifest no longer declares it, so the task takes the plan limit. README: how viewers share that limit.

## 0.1.2

### Patch Changes

- 5424328: Fix: stream() failed on the platform with "Cannot find module 'hls.js/dist/hls.min.js'". The platform bundles a task into one file and ships no node_modules for pure-JS packages, so the player script is now embedded in the package at build time instead of read from node_modules at run time. hls.js is no longer a run-time dependency. README: a section on the VM (call ready within 30 s, write under $HOME, bundled tasks).

## 0.1.1

### Patch Changes

- README: links to other integrations are absolute, so they work on npmjs.com; no link to the unpublished telegram draft.
