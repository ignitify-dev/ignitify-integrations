---
'@ignitify-integrations/stream': patch
---

Fix: stream() failed on the platform with "Cannot find module 'hls.js/dist/hls.min.js'". The platform bundles a task into one file and ships no node_modules for pure-JS packages, so the player script is now embedded in the package at build time instead of read from node_modules at run time. hls.js is no longer a run-time dependency. README: a section on the VM (call ready within 30 s, write under $HOME, bundled tasks).
