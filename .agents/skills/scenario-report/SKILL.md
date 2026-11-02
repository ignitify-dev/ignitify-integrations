---
name: scenario-report
description: Run, verify and report E2E scenarios from artifacts/ignitify/qa/mechanisms on the live fleet, one scenario or a batch. Routes each scenario by its README Kind. `🅣 task` deploys and runs a task in a VM. `🅟 policy` drives a control-plane or tier gate with no VM. `🅜 money` and `🅞 ops` follow their own scenario file. Writes report.md plus attachments/ per scenario, in detailed (default) or brief mode, stops at the first non-PASS and writes investigation.md.
---

> **References** (repo-root paths; run from the repo root):
> - [`HOWTO.md`](../../../artifacts/ignitify/qa/_harness/HOWTO.md) — environment (§1), canonical fleet and baseline (§2), assertion rules and traps (§3), config knobs (§5), store and event catalog (§6), on-host surfaces (§7), report discipline (§8). **This skill does not repeat it.** Where they differ, the HOWTO wins.
> - Templates in `artifacts/ignitify/qa/_harness/report-templates/`: [`task-report-template.md`](../../../artifacts/ignitify/qa/_harness/report-templates/task-report-template.md) (detailed; also holds the on-host footprint table, §10), [`task-report-template-brief.md`](../../../artifacts/ignitify/qa/_harness/report-templates/task-report-template-brief.md) (one page: status and DoD verdicts) and [`policy-report-template.md`](../../../artifacts/ignitify/qa/_harness/report-templates/policy-report-template.md).
> - [`prompts/author-and-bundle-tasks.md`](../../../artifacts/ignitify/qa/_harness/prompts/author-and-bundle-tasks.md) — upstream for `🅣`: authors and packs the task.
> - [`tools/fleet/REUSE.md`](../../../tools/fleet/REUSE.md) and HOWTO §0 — the scripts used below. Call them instead of raw commands.
> - Suite: `artifacts/ignitify/qa/mechanisms/` (the README table is the one source of the scenario list). Output: `artifacts/ignitify/qa/_reports/<report-run>/<kind-NN-slug>/`. Tier profiles: `config/product/tiers/testing/`.

# scenario-report — one scenario or a batch

**Input:** a scenario number or slug, a list or range, or `all`. One scenario is a batch of one. Scenarios run **strictly one at a time**, with no sub-agents: policy rows change the control plane and task rows change the host, so two at once make the evidence unattributable.

**Report mode:** `detailed` (default) or `brief`. Use `brief` when the user asks for a brief, short or quick report. Brief changes only how much is **written**; the run, the checks, the stop-at-first-non-PASS rule and the teardown are identical. Brief exists for `🅣` only (the brief task template); `🅟`, `🅜` and `🅞` always use the policy template. Name the mode in your first message of the batch, and never switch mode mid-batch.

**Output per scenario:** `report.md` + `attachments/`. Every claim cites its evidence inline (HOWTO §8). In brief mode `report.md` is one page and `attachments/` holds only what Steps 0, 6 and 7 create plus the evidence for a non-PASS row.

## Step 0 — Preconditions (once per batch)

1. Three machines up (`control`, `fleet-a`, `fleet-b`), both brains alive, PostgreSQL reachable (HOWTO §1). Name both brains in every journald read.
   ```bash
   limactl list --format '{{.Name}} {{.Status}}'      # control, fleet-a, fleet-b Running
   ./tools/fleet/q.sh 'SELECT current_database(), inet_server_addr();' -tA   # positive control
   ```
2. Both fleet hosts `ACTIVE`: `./tools/fleet/sadmin.sh host:list`. For `🅣` rows each host must also report the builder image and run image equal to the pins (`hosts.base_rootfs_sha256`, `hosts.builder_rootfs_sha256`). Run `bash deploy/verify --env dev fleet-sync` when in doubt. A mismatch or a drained or quarantined host is an operator problem: **stop and say so**. Never repair the fleet or rebuild an image inside a scenario. `deploy/health` and the `verify-*.sh` scripts are operator tools; `verify-lima.sh` re-lays the firewall.
3. `ADMIN_KEY` exported (`deploy/.env` has it). `cd apps/orchestrator && npm run env:lint` exits 0 (one advisory about `null` ladder sides is expected).
4. Six canonical tenants exist (`acme·standard`, `trial·devtrial`, `netcorp·network`, `pincorp·pinned`, `batchco·batch`, `pinnetcorp·pinned-network`; authority: `seed_tenants` in `config/product/environments/dev.yaml`). Never delete them to make room (HOWTO §2).
5. After a database rebuild, restore in this order: `deploy/configure --env dev --check`, `tools/fleet/sadmin.sh env:apply dev`, then the registry step. `seed-tasks.sh` deploys what it registers, except a `no-deploy` manifest row: `task-43-pk-xhost` is registered but left for task-43 leg G7 to deploy (a deployed slug reuses its build). Registry in sync for `🅣` rows: `bash artifacts/ignitify/qa/_harness/seed-tasks.sh --check` exits 0. Without `--check` it registers what is missing (idempotent, never deletes); `--slug <slug>` limits it to one task. Never clear a stale pointer with `task:delete`: it deletes the server task and burns the slug.
6. Name the **`<report-run>`** once: `<today>-v<n>[-<env>]` (for example `2026-10-11-v1-live-pg`). Confirm it with the user before writing any file. Never reuse or rename another run's folder. A report is immutable: to correct one, write a new `<report-run>` and say what it replaces.

## Step 1 — Resolve the scenarios and route by Kind

```bash
awk -F'\\|' '/^\| *\[[0-9a-z-]+\]/ {
  kind=$5; slug=$3; gsub(/^ +| +$/,"",kind); gsub(/^ +| +$|`/,"",slug)
  print kind" → "slug
}' artifacts/ignitify/qa/mechanisms/README.md          # $5 is the Kind column, compared whole
```

⛔ Match the leading Kind token (`🅣 task`, `🅟 policy`, `🅜 money`, `🅞 ops`), never a substring elsewhere on the line. `money-01` reads `🅜 money (B3/B4 🅣 task)`: it is `🅜`, and a `🅣 task` substring match would hand an immutable billing scenario to the task branch.

| Kind | Branch |
| :-- | :-- |
| `🅣 task` | **T** — deploy, run, prove with telemetry, serial log and DB status |
| `🅟 policy` | **P** — drive a gate, prove the verdict and the stored effect; no VM |
| `🅜 money` | **M** — own scenario file, probe tenants only |
| `🅞 ops` | **O** — own scenario file, operator plane |
| anything else | **stop and ask**; a new Kind is a pipeline change |

Read each scenario's Kind and Tier from the README. Neither is inferable from the number. From the scenario file take: the **Slug** (names the output dir), the **profile** (`standard`, `devtrial`, `network`, `pinned`, `batch`, `pinned-network`; refusals use `devtrial`, never `free`), the **assert table and Definition of Done** (each row becomes a row in the report), and the **Readiness** (`⚠️` is expected behaviour: record it, do not fix it). **The run count is binding**: take the maximum any assertion implies. A shortfall leaves the assertion `PENDING`, never silently passed.

## Step 2 — Per scenario: baseline and tenant (all Kinds except `🅜`)

```bash
OUT=$(./tools/fleet/report-init.sh <report-run> <NN-slug>)           # creates the dir and attachments/; refuses to re-init
./tools/fleet/capacity-baseline.sh                                    # per-tenant SELL breakdown; the sum is the expected sell.used
./tools/fleet/sadmin.sh tenant:list | jq -r '.tenants[].name' | sort > "$OUT/attachments/baseline-tenants.txt"
./tools/fleet/sadmin.sh capacity:status | jq '.sell.used'          > "$OUT/attachments/baseline-capacity.json"
```

Only `.sell.used` is compared; BOOT numbers move while a VM tears down.

**Debris stops the run.** A non-canonical tenant, or a `sell.used` above the computed baseline, means the previous teardown failed. Record it as a finding and do not clean it silently (HOWTO §2).

Onboard the scenario's own tenant. Names are `s<NN>-<purpose>`, fixed, with no timestamp:

```bash
./tools/fleet/onboard.sh --scenario <NN> --tier <profile> --purpose <p>   # prints the raw key ONCE
export IGNITIFY_API_KEY=sk_...                                                      # never write it into attachments
```

A scenario that reads policy through a **canonical** tenant uses it as is: map its key (`source artifacts/ignitify/qa/_harness/.prereq-keys.env`; `$ACME_KEY`, `$TRIAL_KEY`, `$NETCORP_KEY`, `$PINCORP_KEY`, `$BATCHCO_KEY`, `$PINNET_KEY`), re-export `IGNITIFY_API_KEY` for every scenario, create no replacement, and delete nothing in Step 4. A `404 deployment not found` on a deployment you just made is a stale key.

Size a probe tier from the live `capacity:status` headroom, never from fixed numbers. If you rescale, say so in the report: `blocked_by` may name a different axis than the scenario prose. Scenario 20, case N6 (`monthly_egress_bytes`): re-measure one policed run's real egress first, then pick a quota above it.

## Step 3 — Branch procedure

### Branch P — `🅟 policy` (no task, no VM)

A policy scenario proves an **admission verdict or a resolved policy**. A run may be submitted only to trip a gate; it is refused before boot. If you look for a serial log, `run.claimed` or `vm.provisioning`, the request was not refused before boot: re-check the verdict.

- **`whoami.policy`.** Capture before and after each mutation and diff. Assert the **resolved** policy, not the tier row.
- **A refusal leaves no row.** Give the absence its own row: `SELECT COUNT(*)` before and after, delta `0`.
- **Audit.** `x-api.req-in`/`req-out` per request, in **Loki only** (`tools/fleet/audit.sh --api <tenant uuid>`), never in `telemetry_records`; `x-admin.*` per operator mutation (`tenant_id IS NULL`, keyed on the resource id `tnt_…`, HOWTO §6A); a host membership act is one `host.*` record with `attrs.actor` (`audit.sh --admin` reads both). A GET emits no operator record. Audit carries ERNs and names, never a secret.
- **Races.** Fire K requests concurrently with one output file each (`fanout.sh`). The proof is the admission distribution (for example one `201`, K−1 `429`) and the DB row count.

```bash
./tools/fleet/ignitify.sh whoami | jq '.policy' > "$OUT/attachments/whoami-before.json"
# The gated request. Capture status line AND body (-i). Assert status and the machine-typed reason/boundBy, never the exit code.
# :8180 is the LB (what a client hits); :8080 / :8081 pin the request to one brain.
curl -is -XPOST http://127.0.0.1:8180/runs -H "Authorization: Bearer $IGNITIFY_API_KEY" \
  -H 'Content-Type: application/json' -d '{ … the request the scenario specifies … }' \
  | tee "$OUT/attachments/verdict-<label>.http"
# DB effect, paired (--after re-runs the stored SQL)
./tools/fleet/db-effect.sh --out "$OUT" --label <l> --before "SELECT count(*) FROM runs WHERE tenant_id='<uuid>';"
#   … the request or the admin mutation (sadmin.sh tier:grant <tenant-id> --tier <other>, tier:deprecate, tenant:disable --reason …) …
./tools/fleet/db-effect.sh --out "$OUT" --label <l> --after
./tools/fleet/ignitify.sh whoami | jq '.policy' > "$OUT/attachments/whoami-after.json"
```

The latest grant is the highest `id` in `tier_grants` (a UUIDv7); `created_at` is not a sort key.

**`[owner:NN]`.** A DoD row with this tag needs a booted VM and is a declared gap, never a pass. Scenario `NN` (a `🅣` row) discharges it. Record it naming `NN` and score it neither PASS nor FAIL. An untagged row is yours. Rules: README `## Rules`, enforced by `apps/orchestrator/guardrails/scenario-dod-ownership.guardrail.test.ts`.

### Branch T — `🅣 task` (deploy, run, prove)

This branch **starts at deploy**. It never authors task code and never runs `task:create`. A missing task, or a run that fails because the task is wrong, goes back to the authoring prompt (Step 7). The build VM compiles the source, so a syntax or import error is a FAILED build naming the file: a task bug.

⛔ **`seed-tasks.sh` deploys what it registers, except a `no-deploy` manifest row.** Task-43 leg G7 needs `task-43-pk-xhost` not yet deployed (a deployed slug reuses its build, so job 1 never runs). Its row is `no-deploy`, so the registry step leaves it for G7. Never `task:delete` it to retry: the slug is burned.

**One exception: a task the scenario runs under its own `s<NN>-` tenant.** Such a task has no manifest row, so `seed-tasks.sh` never registers it. Register it in the run, after `onboard.sh`, with that tenant's key: `./ignitify task:create <slug> --no-scaffold --dir "$PWD/tasks/testing-scenarios/<kind>"`, then `task:deploy` (the same two calls `seed-tasks.sh` makes). It burns nothing: a slug is unique per tenant (`tasks_tenant_id_slug_key`), and `teardown.sh` deletes the tenant. The task folder must already exist; authoring stays upstream.

**Resolve `<kind>`** (the folder under `tasks/testing-scenarios/` that holds the slug: `task/`, `policy/`, `money/`, `ops/` or `docs/`; you never move a task between them):

```bash
ls -1d tasks/testing-scenarios/*/<slug>/ 2>/dev/null | sort -r     # the kind folder where <slug> is authored
```

One kind folder holds `<slug>/` → use it (slugs are unique across kinds). None → **stop** and point at the authoring prompt. `<report-run>` is always `<today>-v<n>[-<env>]` (`report-init.sh` refuses any other shape); it may share its date with `<kind>`. Record the `<kind>` in the report body.

**Check the task and its pointer:**

```bash
ls tasks/testing-scenarios/<kind>/<slug>/   # task.yaml + the runtime's entry file and lockfile (RUNTIME_REGISTRY, packages/contract/task-config.ts); missing → stop
cat tasks/testing-scenarios/<kind>/<slug>/.ignitify/state.json 2>/dev/null           # is it THIS tenant's?
```

A **foreign `state.json`** (left by another tenant's session) makes `task:deploy` answer `task_id not found in .ignitify/state.json`. Do not delete it. The task is already registered server-side, so recover the pointer:

```bash
./tools/fleet/ignitify.sh task:list | jq -c --arg s '<slug>' '(if type=="object" then .tasks else . end)[] | select(.slug==$s) | {id, resource_id}'
#  empty → not registered to this tenant: stop, go to the authoring prompt
jq -n --arg id '<uuid>' --arg rid 'tsk_…' '{task_id:$id, task_resource_id:$rid}' > tasks/testing-scenarios/<kind>/<slug>/.ignitify/state.json
```

**Deploy and run:**

```bash
./tools/fleet/ignitify.sh task:deploy <slug> --taskdir tasks/testing-scenarios/<kind>   # absolutises --taskdir, forces --json
./tools/fleet/ignitify.sh task:run    <slug> --taskdir tasks/testing-scenarios/<kind>   # ONE run; repeat N times for a queue or warm test
# raw CLI: --dir MUST be absolute (HOWTO §1): ./ignitify task:deploy <slug> --dir "$PWD/tasks/testing-scenarios/<kind>"

DEP=$(jq -r .deployment_id tasks/testing-scenarios/<kind>/<slug>/.ignitify/state.json)
./ignitify run:list --deployment-id "$DEP"
./ignitify run:get <run-resource-id> --full
```

- `task:run` prints the `run_…` resource id: use it for `serial.sh` and `run:get`. It targets the latest deployment; `--deployment <id>` pins one (`run:list` takes `--deployment-id`). `--payload`, `--timeout-sec` override `task.yaml`; `--wait` follows the run to its end. `task:pack <slug> --dir "$BASE"` shows the file list and dedup hash. There is no `run:create` or `deployment:create`.
- A `FAILED` deploy naming `init` is almost always the task: the build's smoke boot runs `init()` (HOWTO §3).
- **A bidirectional task runs one VM at a time.** A second run queues (`--on-busy=queue`, default; it sits `PENDING` and looks like a hang) or fails at once (`--on-busy=reject`); behind a pinned VM it is refused. An assertion needing two concurrent VMs of one bidirectional deployment is `BLOCKED-BY-D2`; do not drop it.

**Cancel** (`--yes` is required):

```bash
./ignitify run:cancel <run-resource-id> --yes                # graceful
./ignitify run:cancel <run-resource-id> --yes --force        # skip the grace window; also overrides the pinned-VM refusal; destroys the VM
./ignitify run:cancel <run-resource-id> --yes --grace 30000  # longer wind-down (the server clamps it)
```

| You cancelled… | Expect |
| :-- | :-- |
| a `long` run, no flags | `200 {cancelled:{status:'RUNNING', draining:true, grace_ms}}`; then `COMPLETED` if the guest flushed in time, else `CANCELLED` at the deadline (`cancel_grace_ms`, default 15 s) |
| a short or one-shot run | `CANCELLED` at once |
| anything with `--force` | `CANCELLED` at once. A pinned VM needs `--force` for an immediate cancel (409 without it); a graceful drain leaves the VM and pin alive |

A drain ended by the deadline settles `CANCELLED`, never `FAILED`, and is never retried: assert `failure_attempt_count = 0` and no `run.failed`. The drain needs a guest whose `hello` carries `capabilities: [cancel-ack, reattach]`. If a drain scenario "does nothing" and the VM reports none, the host runs an image that is not the pinned one: **stop and tell the operator**.

**Serial log.** The guest is the Rust `ignitify-guest-supervisor` (PID 1); its records go to the VM serial console as JSON lines (`src.trust:"guest"`) beside the `[init]` marks and the task's output (expected lines: template §9b). The file is on the **fleet host that ran the VM**, in `/var/log/ignitify/vm/` (singular), not on `control`. A retention timer deletes it (30 days or 4 GiB): copy it in the same session.

```bash
./tools/fleet/serial.sh <run_…> --out "$OUT"            # → attachments/serial-<run_id>.txt; one per booted VM
./ignitify run:logs <run_id>                            # tenant-API alternative; Loki: stream trust="guest"
```

Guest records do **not** reach `telemetry_records` (no guest ingest lane). `src->>'trust' = 'guest'` returning 0 is the designed state: assert the guest's words from the serial log, and never file a zero as a defect (HOWTO §6A, §6C).

**Warm reuse:**

```bash
./tools/fleet/q.sh "SELECT count(DISTINCT vm_id) FROM telemetry_records WHERE deployment_id='$DEP' AND payload->'attrs'->>'name'='vm.provisioning';" -tA
./tools/fleet/q.sh "SELECT payload->'attrs'->>'reuse' reuse, count(*) FROM telemetry_records WHERE deployment_id='$DEP' AND payload->'attrs'->>'name'='run.claimed' GROUP BY 1;"
./tools/fleet/q.sh "SELECT vm_id, count(*) FROM runs WHERE deployment_id='$DEP' GROUP BY vm_id;" -tA
```

Warm: one `vm.provisioning` serves N runs and the later runs show `run.claimed` with `reuse=warm`. Cold only: one `vm.provisioning` per run and no `reuse=warm`.

**Deterministic warm test:** set `scheduler.max_concurrent_vms: 1` in the **live** `config.yaml` and restart **both** brains. It is an operator knob and a footprint row, never a task edit. `1` admits one VM **per host**, so also take the second host out of placement with `host:quarantine`, then `host:activate`. Never `host:drain` (one-way). Details: HOWTO §5.

**Fault lever: signal a run's Firecracker process.** `kill -9` kills the VM (`vm-exited`, retried). `kill -STOP` leaves it silent (the silence reaper ends it, `Timeout Exceeded`, terminal). A task's own `exit` or throw is terminal, so a host signal is the only way to make a transient failure. ⛔ Never `pgrep -f` or `pkill -f` (they match your own shell). The `vm_id` is not on Firecracker's command line because the jailer id replaces every `_` with `-`. Resolve the pid from the jail, check it, then signal it:

```bash
VM=$(./tools/fleet/q.sh "SELECT vm_id FROM runs WHERE id = '<run_id>';" -tA)
FQDN=$(./tools/fleet/q.sh "SELECT h.fqdn FROM runs r JOIN hosts h ON h.id = r.host_id WHERE r.id = '<run_id>';" -tA)
HOST=${FQDN%%.*}; HOST=${HOST#lima-}; JAIL=${VM//_/-}          # lima-fleet-b.internal → fleet-b
# On that host (limactl shell "$HOST"):
JDIR=/srv/jailer/firecracker/$JAIL
PID=$(sudo cat "$JDIR/root/firecracker.pid")
if sudo cat "/proc/$PID/cmdline" | tr '\0' ' ' | grep -F -- "--id $JAIL" >/dev/null; then
  sudo kill -9 "$PID"                                           # or: sudo kill -STOP "$PID"
else echo "pid $PID is not this VM — do NOT signal it"; fi
sudo test -e "$JDIR" && echo "JAIL STILL THERE" || echo "jail gone"   # after -STOP: once the reaper has run
```

Record the pid-guard match and the "jail gone" line as evidence rows. An unguarded kill is not evidence.

To prove "jail gone" you must first see the jail alive (a short VM lives about 6 s): submit with `task:run` (no `--wait`), then on the host `for i in $(seq 40); do sudo test -e /srv/jailer/firecracker/$JAIL && echo ALIVE && break; sleep 0.25; done`, then test again after the run ends. Read `runs.vm_id` after `run.running` to build `$JAIL`. Use this only when the scenario asserts the jail; otherwise the row stays VACUOUS.

**On-host footprint:** the paths a run leaves on the fleet host and on `control`, and what each looks like after teardown, are in **template §10**. The image-cache key is `deployments.content_digest`; `content_hash` is the source key and finds nothing in the cache.

### Branch M — `🅜 money` (own file, probe tenants only)

- ⛔⛔ **Never use a canonical tenant.** Create your own `*probe` tenants and delete them at the end.
- ⛔ **A published price is never edited** (`UNIQUE (tier_name, currency, effective_from_period)`, stored amount); the only fix is a `DELETE` behind the product's back. Delete every price row the scenario fabricated. A failed run is a finding.
- Measure an exit code without a pipe (`cmd | tail` then `$?` reports `tail`).
- Skip the Step 2 baseline for the canonical tenants. Prove at the end that your probes are gone. Follow the scenario file for every case; a `B3`/`B4`-style case that needs a real run follows Branch T for that case only.

### Branch O — `🅞 ops` (own file, operator plane)

- The subject is Prometheus, Grafana, journald, an inode or `df`. Runs are only vehicles; no task is authored.
- Some legs change the host on purpose (a stopped agent, a lowered logrotate threshold, a scenario alert rule). Each change and each revert is a numbered row in the ledger. **Restore the host and say so.**
- Follow the scenario file for every case. Where the file names a gap it deliberately does not prove, state it in the report's findings.

## Step 4 — Evidence backbone (P, T, O)

```bash
./tools/fleet/trail-fresh.sh                                            # lag is not absence: run before claiming a missing signal
./tools/fleet/store-snapshot.sh --out "$OUT" --tenant <tenant_uuid>    # 🅟: tenant slice + control-events.jsonl (control, windowed; --minutes widens it)
./tools/fleet/store-snapshot.sh --out "$OUT" --dep "$DEP"              # 🅣: --dep, not --tenant (a tenant's whole history is thousands of records)
./tools/fleet/audit.sh --admin <tnt_…>                                 # operator mutations
./tools/fleet/audit.sh --api <tenant_uuid>                             # gate verdicts
./tools/fleet/q.sh "SELECT id,status,vm_id,started_at,correlation_id,substr(result::text,1,80),substr(progress::text,1,40),instructions FROM runs WHERE deployment_id='$DEP' ORDER BY created_at DESC;" > "$OUT/attachments/db-runs.txt"   # 🅣
./tools/fleet/brain-log.sh --grep "<ids>" --out "$OUT"    # both brains; writes attachments/orchestrator-slice.txt
```

- **`*.log` is gitignored.** An attachment named `*.log` is silently dropped at commit while a registered one still looks verified. Register only `.txt`, `.jsonl`, `.json` or `.md`. The serial log is evidence; the full journald capture (20–30 MB) is scratch: never register it, grep the lines you need into a `.txt`. Do not add a `.gitignore` exception. Check: `ls "$OUT"/attachments | grep '\.log$' || echo OK`.
- Keep temp files under `$OUT`, never `/tmp` (Lima cannot see macOS temp paths). Note the wall clock of each action the store does not cover; the CLI emits no telemetry.
- **Dedupe the slice by `id`** before you count: a restart re-publishes records. `jq -sc 'unique_by(.id) | sort_by(.occurred_at)[]'`. Keep the raw slice as the attachment and say so in the report. Count records, not string occurrences (each carries its name twice).

## Step 5 — Write report.md

Use the Kind's template: `🅣` → task template (brief mode: the brief task template); `🅟`, `🅜`, `🅞` → policy template (a section that does not apply renders `None`).

**Brief mode (`🅣` only).** Fill the brief template instead of the list below, and keep the discipline that the list encodes:
- One row per DoD row, in the scenario's order, each with a verdict and one proof. The proof is still gathered the same way: assert `run.succeeded` **and** `runs.status = COMPLETED` (item 5), never a dead id or an invented event; an unobserved post-run state is VACUOUS, never PASS (item 3); missing data is a GAP (item 5). A mismatch names the first divergent record in **Problems** (item 4).
- Record every host footprint you changed and reverted (config edit, restart, grant, DB poke: item 6) as one line in **Cleanup**: what, before, after, reverted yes/no.
- Skip the evidence ledger, the serial/store-snapshot write-up and the per-run tables. Do not copy evidence into `attachments/` for a `PASS`; do copy it for any non-PASS row (it is perishable).
- Item 7 (leak-scan, `sha256` registration) and item 8 (verdict rule, including `BLOCKED`) apply unchanged.
- On a non-PASS, write the brief report, then Step 7 as usual, and offer a detailed re-run.

Detailed mode: fill in this order, verdict last:

1. **The evidence ledger (§4), ascending by `occurred_at`.** Each row has a number, the event (`payload.attrs.name`), its time, a pointer to proof, and the last 8 characters of the record `id` (the first 8 are a shared UUIDv7 time prefix). Cite evidence as an anchor: `§4#9 · 3f2a91bc`.
2. **Every assertion is one row**: expected vs observed, a verdict (PASS, FAIL, PENDING, GAP) and an evidence pointer. A `🅟` stored effect is a before/after table re-queried on both sides, including delta `0` rows. Verdicts quote the status line and `reason`/`boundBy` from the saved `curl -i`.
3. **Record the full evidence, not a summary.** For a serial or telemetry stream: byte size, record count, timestamp span and cadence (`span / (N − 1)`). For terminal DB state: `status`, `result`, `progress`, `attempt_count`, `failure_attempt_count`. Name the exact brain units (which dispatched, which reaped). An unobserved post-run state (an empty `/srv/jailer/` after VM death) is **VACUOUS**, never PASS, unless you saw it created during the VM's life. A cut last serial line is expected (HOWTO §6C), not a finding.
4. **Every run's terminal status is a row with a reason** (`COMPLETED`, `FAILED` or `CANCELLED`, and why). On a mismatch give the first divergent record and the likely cause; never reconcile silently.
5. **Success has an event**: assert `run.succeeded` **and** `runs.status = COMPLETED` (HOWTO §6A). Never assert a dead id or invent an event name. Missing data is a GAP row; mark a reconstructed time as inferred.
6. **Every host footprint is a numbered row**, one for the change and one for the revert:
   - A config edit (`config.yaml` or `task.yaml`): file, key, before, after, reason, whether a restart was needed.
   - An orchestrator kill or restart: the exact signal, the pid, the expected recovery, how long it was down, what the startup sweep reclaimed. `SIGKILL` is a crash; `SIGTERM` is a graceful stop. Verify you signalled the process you meant to: a brain started from the checkout runs under `tsx` and has a different MainPID (HOWTO §3).
   - A tier grant, a DB poke, an ingress route change: the same rule. Ingress changes already emit `ingress.route-*` events; cite those.
7. **Secrets never appear.** Run `./tools/fleet/leak-scan.sh "$OUT"`, then register every attachment with its real `sha256` (`tools/fleet/register-attachments.sh`). Mark operator-only material (raw serial excerpts, host paths) as operator visibility (HOWTO §3 rule 5, §8).
8. **Verdict last:** `PASS` only if every assertion passed, `FAIL` if any failed, `PENDING` if any is open, `BLOCKED` if the task is wrong. On `FAIL`, name the class (Step 7) in the first sentence.

## Step 6 — Tear down and prove the baseline

```bash
./tools/fleet/teardown.sh --scenario <NN>          # deletes only s<NN>- tenants, then re-asserts the baseline
./tools/fleet/sadmin.sh tenant:list | jq -r '.tenants[].name' | sort > "$OUT/attachments/final-tenants.txt"
./tools/fleet/sadmin.sh capacity:status | jq '.sell.used'          > "$OUT/attachments/final-capacity.json"
diff "$OUT/attachments/baseline-tenants.txt"  "$OUT/attachments/final-tenants.txt"    # expect no output
diff "$OUT/attachments/baseline-capacity.json" "$OUT/attachments/final-capacity.json"  # expect no output
```

- A non-empty diff is a finding: record it with what is still committed. A published ad-hoc tier cannot be deleted; an ungranted tier commits no capacity (harmless residue).
- A scenario that mutates a canonical tenant (re-grant, disable) restores the original grant or status and proves it with the diff. Do not delete the tenant.
- Register `baseline-*` and `final-*` in the attachments table.

## Step 7 — Not PASS: stop, investigate, document

**Trigger:** `FAIL`, `PENDING` or `BLOCKED`, including one failed assertion among passing ones. **Stop at the first one.** Do not start the next scenario. Write `investigation.md`, report to the user, and wait. The batch resumes only when the user says so.

1. **Investigate to a root cause.** Start from the verdict and BEFORE/AFTER effect (`🅟`) or the first divergent anchor (`🅣`). Copy perishable evidence first (serial log, fresh journal slice, store snapshot, the `runs` row) into `attachments/`. The host is the oracle: re-query the DB and the substrate the gate reads (`capacity:status`, resolved tier version, warm pool, `tc`/`ipset`/Envoy). A root cause is a code path or a state fact, not a plausible story; if you cannot reach one, write `INCONCLUSIVE` and list what you ruled out. Suspect a second defect in the same function.
2. **Classify:**

| Class | Meaning | Fix routes to |
| :-- | :-- | :-- |
| Environment or host debris | platform fine, host wrong (SELL 409 from leftovers, un-provisioned host, wrong `config.yaml` knob, stale grant) | fix it, re-run as a new `<report-run>`; bounded retries, then leave `PENDING` |
| Task bug (`🅣` only) | the scenario's task code is wrong | `BLOCKED`; the authoring prompt re-packs, then wait for the user. Do not edit task code here |
| System defect | the platform did the wrong thing | an engineer: propose the code change |
| Scenario-spec defect | the scenario asserts something the system was never built to do | an architect: propose the scenario edit |

The last two are easily confused and route to different people. Example: a scenario expecting `whoami` to render a `NULL` column where the system resolves it is a spec defect.

3. **Write `investigation.md`** beside the failing report and link it from `report.md`:

| Section | Content |
| :-- | :-- |
| What failed | the assertion verbatim: expected vs observed, evidence quoted (`🅣`: anchored) |
| Root cause | code path (`file:line`) or state fact, or `INCONCLUSIVE` with what you ruled out |
| Classification | one row of the table, and why |
| Proposed solution | the concrete change for the owner: a proposal, not a patch you apply |
| Blast radius | other scenarios on the same gate or path, host state left changed, whether earlier `PASS` verdicts are now suspect |

Propose; do not fix mid-batch. Editing production code, task code or the scenario changes what the remaining scenarios test. Environment cleanup is the only fix you may apply. Never silently pass or drop a failed assertion.

## Step 8 — Batch end

1. Every scenario has `report.md` and `attachments/` at `qa/_reports/<report-run>/<kind-NN-slug>/`, with every evidence file registered. Every non-`PASS` scenario has `investigation.md`.
2. Print a summary table: `<NN-slug>` → `PASS | FAIL(system) | FAIL(scenario-spec) | BLOCKED(task-bug) | PENDING(why)`, with each failure's `investigation.md` link.
3. List the open proposals by owner (authoring prompt, engineer, architect) and every host change left behind.

---

How the system behaves (gates, store, config, traps) → HOWTO. Report structure and the on-host footprint table → the templates. A new trap goes in the HOWTO.
