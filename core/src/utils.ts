// Small helpers shared by more than one module. Pure; never mutate an argument.

import { PACKAGE_SCOPE } from './constants.js';

/** npm name of an integration: `@ignitify-integrations/<name>`. The one place this name is built. */
export const packageName = (name: string): string => `${PACKAGE_SCOPE}/${name}`;

/**
 * Does an integration have code? The one rule: its package.json has an `exports` entry. A client
 * sees only the installed package (no `src/`), so the rule reads what is published.
 */
export const hasCode = (packageJson: unknown): boolean =>
  typeof packageJson === 'object' && packageJson !== null && 'exports' in packageJson;

/** Position in an ordered vocabulary (NETWORK_TYPES, PRESETS); -1 when unknown. */
export const rank = (order: readonly string[], value: string): number => order.indexOf(value);

/** The larger of two values of an ordered vocabulary. */
export const maxOf = <T extends string>(order: readonly T[], a: T, b: T): T =>
  rank(order, a) >= rank(order, b) ? a : b;

/** `a` in its order, then each item of `b` that is new. */
export const union = <T>(a: readonly T[], b: readonly T[]): T[] => [...new Set([...a, ...b])];

/** `{ [key]: value }`, or `{}` when value is undefined, so a spread never writes an absent key. */
export const optional = <K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> =>
  value === undefined ? {} : ({ [key]: value } as Record<K, V>);
