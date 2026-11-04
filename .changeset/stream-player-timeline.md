---
'@ignitify-integrations/stream': patch
---

Player: hls.js plays wherever it runs, so the video has a timeline (native HLS only where hls.js cannot run, such as iOS Safari), and a LIVE button shows when the viewer is at the live edge and goes back to it. Viewer count: each player tab sends an id with its playlist requests; streaming chunks add `viewers` (players seen in the last 15 s, at most 1000) and the result adds `peak_viewers`.
