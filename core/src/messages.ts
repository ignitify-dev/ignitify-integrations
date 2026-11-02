// Every message core returns, grouped by concern. Messages are the CLI's user interface, so
// they say what is wrong AND what to do, and they name the manifest path or task.yaml field.

import { CALLBACK_ROUTE_PREFIX, EGRESS_ALLOW_MAX } from './constants.js';

const list = (items: readonly string[]): string => items.join(', ');

export const MANIFEST_MESSAGES = {
  yaml: (reason: string) => `not valid YAML: ${reason}`,
  schema: (path: string, message: string) => `${path}: ${message}`,
  badHost: (host: string) =>
    `network.egress_allow: "${host}" is not a lower-case DNS name with at least two labels and no wildcard (hosts that vary go in network.egress_hint)`,
  egressNeedsNic: (key: string) => `network.${key}: needs network.type "egress" or "bidirectional"`,
  inboundNeedsBidirectional: (key: string) => `network.${key}: needs network.type "bidirectional"`,
  shadowsCallback: (prefix: string) =>
    `network.inbound_routes: "${prefix}" would shadow the platform callback route ${CALLBACK_ROUTE_PREFIX}`,
} as const;

export const PLAN_MESSAGES = {
  // line 1 of the plan
  settingsOnly: 'settings only',
  settingsAndCode: 'settings + code',
  runs: (packages: readonly string[]) => `runs ${list(packages)}`,
  // refusals of integration:add
  conflict: (field: string, current: string | number, wanted: string | number, label: string) =>
    `${field} is ${String(current)} but ${label} needs ${String(wanted)}: change it by hand or use another task`,
  tooManyHosts: (count: number) =>
    `execution.network.egress_allow would list ${count} hosts; the platform allows at most ${EGRESS_ALLOW_MAX}`,
  // notes of integration:add
  networkRaised: (from: string, to: string) => `execution.network.type: ${from} -> ${to}`,
  egressAnywhere: (hosts: readonly string[]) =>
    `execution.network.egress_allow is absent (any host), so it stays absent; this integration needs: ${list(hosts)}`,
  presetRaised: (from: string | undefined, to: string) => `run.preset: ${from ?? '(default)'} -> ${to}`,
  presetUnknown: (preset: string, min: string) =>
    `run.preset ${preset} is not a known preset; left as is (this integration needs at least ${min})`,
  // "you add" lines
  // `(new)`: the task does not declare this secret yet. A declared one still gets a line: the CLI
  // cannot see whether its value is set.
  setSecret: (name: string, isNew: boolean) =>
    `secret ${name}${isNew ? ' (new)' : ''}: ignitify secret:set ${name} --stdin`,
  addHost: (hint: string) => `egress host: ${hint}`,
} as const;

export const COVERAGE_MESSAGES = {
  secretMissing: (label: string, name: string) => `${label}: secret ${name} is missing from secrets`,
  hostMissing: (label: string, host: string) => `${label}: host ${host} is missing from execution.network.egress_allow`,
  networkTooSmall: (label: string, have: string, need: string) =>
    `${label}: execution.network.type is ${have}, needs ${need}`,
  fieldMismatch: (label: string, field: string, have: unknown, need: string | number) =>
    `${label}: ${field} is ${have === undefined ? '(absent)' : String(have)}, needs ${String(need)}`,
  packageMissing: (label: string, name: string) =>
    `${label}: system package ${name} is missing from build.system_packages`,
  presetTooSmall: (label: string, have: string | undefined, need: string) =>
    `${label}: run.preset is ${have ?? '(default)'}, needs at least ${need}`,
  routeMissing: (label: string, prefix: string) =>
    `${label}: route ${prefix} is missing from execution.network.inbound_routes`,
} as const;
