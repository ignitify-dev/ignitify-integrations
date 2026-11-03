// Types of the manifest and of the task.yaml slice the CLI edits.
// Plain interfaces and unions only; the JSON Schema (schema.ts) is the runtime check.

import type { DURATIONS, INTERACTIONS, NETWORK_TYPES, PRESETS, RUNTIMES, SCHEMA_VERSION } from './constants.js';

export type Runtime = (typeof RUNTIMES)[number];
export type NetworkType = (typeof NETWORK_TYPES)[number];
export type Preset = (typeof PRESETS)[number];
export type Duration = (typeof DURATIONS)[number];
export type Interaction = (typeof INTERACTIONS)[number];

// ── manifest (integration.yaml) ──────────────────────────────────────────────
// Version, description and licence live in package.json: one source each.

export interface InboundRoute {
  readonly prefix: string;
}

/** A task's inbound route: a prefix (as in a manifest) or the platform's exact path. */
export type TaskInboundRoute = InboundRoute | { readonly path: string };

export interface NetworkSpec {
  readonly type: NetworkType;
  /** A FIXED host list, written into task.yaml as is. */
  readonly egress_allow?: readonly string[];
  /** Hosts that vary per tenant (a bucket host, a source host): the plan prints this under "you add". */
  readonly egress_hint?: string;
  readonly inbound_port?: number;
  readonly inbound_routes?: readonly InboundRoute[];
  readonly inbound_max_concurrent?: number;
}

export interface ExecutionSpec {
  readonly duration?: Duration;
  readonly interaction?: Interaction;
}

export interface Manifest {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly name: string;
  readonly runtimes: readonly Runtime[];
  /** Default secret names the integration reads from ctx.secrets. */
  readonly secrets?: readonly string[];
  readonly network?: NetworkSpec;
  readonly execution?: ExecutionSpec;
  /** OS packages the integration runs as separate processes (`ffmpeg`). */
  readonly system_packages?: readonly string[];
  readonly min_preset?: Preset;
}

// ── task.yaml: the slice `integration:add` edits ─────────────────────────────
// Unknown keys are kept as they are: the CLI edits only what it owns.

export interface TaskNetwork {
  readonly type?: NetworkType;
  readonly egress_allow?: readonly string[];
  readonly inbound_port?: number;
  readonly inbound_routes?: readonly TaskInboundRoute[];
  readonly inbound_max_concurrent?: number;
  readonly [key: string]: unknown;
}

export interface TaskExecution {
  readonly duration?: string;
  readonly interaction?: string;
  readonly network?: TaskNetwork;
  readonly [key: string]: unknown;
}

export interface TaskConfig {
  readonly secrets?: readonly string[];
  readonly execution?: TaskExecution;
  readonly build?: { readonly system_packages?: readonly string[]; readonly [key: string]: unknown };
  readonly run?: { readonly preset?: string; readonly [key: string]: unknown };
  readonly [key: string]: unknown;
}

// ── plan.ts: what the CLI gets back ──────────────────────────────────────────

/** The new task config, the lines the CLI prints with the plan, and what the tenant must still do. */
export interface PlanOutcome {
  readonly config: TaskConfig;
  readonly notes: readonly string[];
  /** "you add" lines: secret values to set and hosts that vary per tenant. */
  readonly youAdd: readonly string[];
}
