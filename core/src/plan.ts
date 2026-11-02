// The pure logic behind `integration:add` and `task:validate`. Each function reads a task config
// and manifests and returns a NEW config or a list of issues (inputs are never changed).
// One function, `needsOf`, says what a manifest needs; add and coverage both compare against it,
// so they cannot disagree. Removal is `npm uninstall`: leftover settings are the tenant's to delete.

import { err, ok, type Result } from '@ignitify-integrations/runtime';
import { EGRESS_ALLOW_MAX, NETWORK_TYPES, PRESETS } from './constants.js';
import { COVERAGE_MESSAGES, PLAN_MESSAGES } from './messages.js';
import type {
  ExecutionSpec,
  InboundRoute,
  Manifest,
  NetworkType,
  PlanOutcome,
  Preset,
  TaskConfig,
  TaskNetwork,
} from './types.js';
import { maxOf, optional, packageName, rank, union } from './utils.js';

const EXECUTION_FIELDS = ['duration', 'interaction'] as const;
const INBOUND_FIELDS = ['inbound_port', 'inbound_max_concurrent'] as const;

/** What one integration needs from task.yaml. */
interface Needs {
  readonly hosts: readonly string[];
  readonly secrets: readonly string[];
  readonly networkType: NetworkType;
  readonly inbound_port?: number;
  readonly inbound_max_concurrent?: number;
  readonly inboundRoutes: readonly InboundRoute[];
  readonly execution: ExecutionSpec;
  readonly systemPackages: readonly string[];
  readonly minPreset?: Preset;
}

const needsOf = (manifest: Manifest): Needs => ({
  hosts: manifest.network?.egress_allow ?? [],
  secrets: manifest.secrets ?? [],
  networkType: manifest.network?.type ?? 'none',
  inbound_port: manifest.network?.inbound_port,
  inbound_max_concurrent: manifest.network?.inbound_max_concurrent,
  inboundRoutes: manifest.network?.inbound_routes ?? [],
  execution: manifest.execution ?? {},
  systemPackages: manifest.system_packages ?? [],
  minPreset: manifest.min_preset,
});

/**
 * Line 1 of the plan: `@ignitify-integrations/<name>@<version> · settings only`. `version` and
 * `hasCode` come from the installed package.json (the CLI reads it; core never touches the disk).
 */
export const planHeadline = (manifest: Manifest, version: string, hasCode: boolean): string => {
  const packages = manifest.system_packages ?? [];
  return [
    `${packageName(manifest.name)}@${version}`,
    hasCode ? PLAN_MESSAGES.settingsAndCode : PLAN_MESSAGES.settingsOnly,
    ...(packages.length > 0 ? [PLAN_MESSAGES.runs(packages)] : []),
  ].join(' · ');
};

/** A single-valued task field the integration needs: write it if absent, refuse a different value. */
const pick = <T extends string | number>(
  field: string,
  current: T | undefined,
  wanted: T | undefined,
  label: string,
): { readonly value: T | undefined; readonly conflict?: string } => {
  if (wanted === undefined || current === wanted) return { value: current };
  if (current === undefined) return { value: wanted };
  return { value: current, conflict: PLAN_MESSAGES.conflict(field, current, wanted, label) };
};

const unionRoutes = (current: readonly InboundRoute[], wanted: readonly InboundRoute[]): InboundRoute[] => [
  ...current,
  ...wanted.filter((route) => !current.some((have) => have.prefix === route.prefix)),
];

const egressFor = (current: TaskNetwork | undefined, needs: Needs, notes: string[]): readonly string[] | undefined => {
  if (current?.egress_allow !== undefined) return union(current.egress_allow, needs.hosts);
  // A NIC with no list means "any host": writing a list now would NARROW the tenant's egress.
  if ((current?.type ?? 'none') !== 'none') {
    if (needs.hosts.length > 0) notes.push(PLAN_MESSAGES.egressAnywhere(needs.hosts));
    return undefined;
  }
  // A new NIC starts fail-closed: exactly the hosts this integration needs, possibly none.
  return needs.hosts;
};

const networkFor = (
  current: TaskNetwork | undefined,
  needs: Needs,
  label: string,
  notes: string[],
  refusals: string[],
): TaskNetwork | undefined => {
  if (needs.networkType === 'none') return current;
  const from = current?.type ?? 'none';
  const type = maxOf(NETWORK_TYPES, from, needs.networkType);
  if (type !== from) notes.push(PLAN_MESSAGES.networkRaised(from, type));
  const inbound = INBOUND_FIELDS.map((field) => {
    const picked = pick(`execution.network.${field}`, current?.[field], needs[field], label);
    if (picked.conflict !== undefined) refusals.push(picked.conflict);
    return optional(field, picked.value);
  });
  const egress = egressFor(current, needs, notes);
  if (egress !== undefined && egress.length > EGRESS_ALLOW_MAX)
    refusals.push(PLAN_MESSAGES.tooManyHosts(egress.length));
  const routes =
    needs.inboundRoutes.length > 0 ? unionRoutes(current?.inbound_routes ?? [], needs.inboundRoutes) : undefined;
  return {
    ...current,
    type,
    ...optional('egress_allow', egress),
    ...Object.assign({}, ...inbound),
    ...optional('inbound_routes', routes),
  };
};

const presetFor = (current: string | undefined, min: Preset | undefined, notes: string[]): string | undefined => {
  if (min === undefined) return current;
  const have = current === undefined ? -1 : rank(PRESETS, current);
  if (current !== undefined && have < 0) {
    notes.push(PLAN_MESSAGES.presetUnknown(current, min));
    return current;
  }
  if (have >= rank(PRESETS, min)) return current;
  notes.push(PLAN_MESSAGES.presetRaised(current, min));
  return min;
};

/**
 * `integration:add`: the task config with everything the manifest needs, or every refusal.
 * Secrets, hosts and system packages are a union; network type and preset are only raised; a
 * single-valued field the task sets to a different value is refused, naming the field.
 * Adding the same integration again gives the same config (idempotent).
 */
export const planAdd = (config: TaskConfig, manifest: Manifest): Result<PlanOutcome, string[]> => {
  const label = packageName(manifest.name);
  const needs = needsOf(manifest);
  const notes: string[] = [];
  const refusals: string[] = [];
  const execution = config.execution;
  const fields = EXECUTION_FIELDS.map((field) => {
    const picked = pick(`execution.${field}`, execution?.[field], needs.execution[field], label);
    if (picked.conflict !== undefined) refusals.push(picked.conflict);
    return optional(field, picked.value);
  });
  const network = networkFor(execution?.network, needs, label, notes, refusals);
  if (refusals.length > 0) return err(refusals);

  const touchesExecution = network !== undefined || fields.some((field) => Object.keys(field).length > 0);
  const packages = needs.systemPackages;
  const preset = presetFor(config.run?.preset, needs.minPreset, notes);
  const hint = manifest.network?.egress_hint;
  return ok({
    config: {
      ...config,
      ...optional('secrets', needs.secrets.length > 0 ? union(config.secrets ?? [], needs.secrets) : undefined),
      ...optional(
        'execution',
        touchesExecution
          ? { ...execution, ...Object.assign({}, ...fields), ...optional('network', network) }
          : undefined,
      ),
      ...optional(
        'build',
        packages.length > 0
          ? { ...config.build, system_packages: union(config.build?.system_packages ?? [], packages) }
          : undefined,
      ),
      ...optional('run', preset !== config.run?.preset ? { ...config.run, preset } : undefined),
    },
    notes,
    youAdd: [
      ...needs.secrets.map((name) => PLAN_MESSAGES.setSecret(name, !(config.secrets ?? []).includes(name))),
      ...(hint === undefined ? [] : [PLAN_MESSAGES.addHost(hint)]),
    ],
  });
};

const coverageIssues = (config: TaskConfig, label: string, needs: Needs): string[] => {
  const execution = config.execution;
  const network = execution?.network;
  const egress = network?.egress_allow;
  const have = network?.type ?? 'none';
  const secrets = config.secrets ?? [];
  const packages = config.build?.system_packages ?? [];
  const preset = config.run?.preset;
  const presetRank = preset === undefined ? -1 : rank(PRESETS, preset);
  const routes = network?.inbound_routes ?? [];
  return [
    ...needs.secrets
      .filter((name) => !secrets.includes(name))
      .map((name) => COVERAGE_MESSAGES.secretMissing(label, name)),
    ...(egress === undefined ? [] : needs.hosts.filter((host) => !egress.includes(host))).map((host) =>
      COVERAGE_MESSAGES.hostMissing(label, host),
    ),
    ...(rank(NETWORK_TYPES, have) < rank(NETWORK_TYPES, needs.networkType)
      ? [COVERAGE_MESSAGES.networkTooSmall(label, have, needs.networkType)]
      : []),
    ...EXECUTION_FIELDS.flatMap((field) => {
      const need = needs.execution[field];
      return need === undefined || execution?.[field] === need
        ? []
        : [COVERAGE_MESSAGES.fieldMismatch(label, `execution.${field}`, execution?.[field], need)];
    }),
    ...INBOUND_FIELDS.flatMap((field) => {
      const need = needs[field];
      return need === undefined || network?.[field] === need
        ? []
        : [COVERAGE_MESSAGES.fieldMismatch(label, `execution.network.${field}`, network?.[field], need)];
    }),
    ...needs.inboundRoutes
      .filter((route) => !routes.some((present) => present.prefix === route.prefix))
      .map((route) => COVERAGE_MESSAGES.routeMissing(label, route.prefix)),
    ...needs.systemPackages
      .filter((name) => !packages.includes(name))
      .map((name) => COVERAGE_MESSAGES.packageMissing(label, name)),
    // An unknown preset cannot be judged here (planAdd notes it); absent means the platform default.
    ...(needs.minPreset !== undefined &&
    (preset === undefined || (presetRank >= 0 && presetRank < rank(PRESETS, needs.minPreset)))
      ? [COVERAGE_MESSAGES.presetTooSmall(label, preset, needs.minPreset)]
      : []),
  ];
};

/**
 * `task:validate`: every way task.yaml no longer covers an installed integration. The CLI passes
 * the manifests of the `@ignitify-integrations/*` packages in node_modules. Empty = covered.
 * Hosts in `egress_hint` vary per tenant, so they cannot be checked here.
 */
export const checkCoverage = (config: TaskConfig, manifests: readonly Manifest[]): string[] =>
  manifests.flatMap((manifest) => coverageIssues(config, packageName(manifest.name), needsOf(manifest)));
