// Licence check over package-lock.json: every package that can be LINKED into a published
// item must carry an allowed licence. Pure: the bin reads the lockfile.

import { err, ok, type Result } from '@ignitify-integrations/runtime';
import { DEPENDENCY_LICENCES } from './constants.js';
import { LICENCE_MESSAGES } from './messages.js';

const TOKEN = /\(|\)|[^\s()]+/g;
const OR = 'OR';
const AND = 'AND';
const WITH = 'WITH';

/**
 * Is an SPDX expression allowed? `A OR B` needs one allowed side, `A AND B` both. AND binds
 * tighter than OR and parentheses group, as in the SPDX spec: stripping parentheses instead
 * would read `MIT AND (X OR Y)` as `(MIT AND X) OR Y` and could pass a licence it should not.
 * `X WITH exception` is never on the allow-list, so it is refused for a human to review.
 * Operators are matched case-insensitively because many published packages write `or`.
 */
export const licenceAllowed = (expression: string, allowed: readonly string[]): Result<boolean> => {
  const tokens = expression.match(TOKEN) ?? [];
  let at = 0;
  const peek = (): string | undefined => tokens[at]?.toUpperCase();
  const fail = (): Result<boolean> => err(expression);

  const atom = (): Result<boolean> => {
    const token = tokens[at];
    if (token === undefined || token === ')' || [OR, AND, WITH].includes(token.toUpperCase())) return fail();
    at += 1;
    if (token === '(') {
      const inner = or();
      if (!inner.ok || tokens[at] !== ')') return fail();
      at += 1;
      return inner;
    }
    if (peek() === WITH) {
      at += 2;
      return tokens[at - 1] === undefined ? fail() : ok(false);
    }
    return ok(allowed.includes(token));
  };

  const chain = (operator: string, next: () => Result<boolean>, combine: (a: boolean, b: boolean) => boolean) => {
    return (): Result<boolean> => {
      let result = next();
      while (result.ok && peek() === operator) {
        at += 1;
        const right = next();
        result = right.ok ? ok(combine(result.value, right.value)) : right;
      }
      return result;
    };
  };

  const and = chain(AND, atom, (a, b) => a && b);
  const or: () => Result<boolean> = chain(OR, and, (a, b) => a || b);

  const result = or();
  return result.ok && at === tokens.length && tokens.length > 0 ? result : fail();
};

interface LockEntry {
  readonly license?: unknown;
  readonly link?: boolean;
  readonly dev?: boolean;
}

const isLinked = ([key, entry]: [string, LockEntry]): boolean =>
  key !== '' && entry.link !== true && entry.dev !== true;

/**
 * Issues for every lockfile v2/v3 package outside the allow-list. Skipped: the root, workspace
 * links (our own code, checked by check-items) and `dev: true` entries (never linked into a
 * published item).
 */
export const checkLicences = (lockfile: unknown, allowed: readonly string[] = DEPENDENCY_LICENCES): string[] => {
  const packages = (lockfile as { packages?: unknown } | null)?.packages;
  if (typeof packages !== 'object' || packages === null) return [LICENCE_MESSAGES.noPackages];
  return Object.entries(packages as Record<string, LockEntry>)
    .filter(isLinked)
    .flatMap(([key, entry]) => {
      if (typeof entry.license !== 'string' || entry.license === '') return [LICENCE_MESSAGES.missing(key)];
      const verdict = licenceAllowed(entry.license, allowed);
      if (!verdict.ok) return [LICENCE_MESSAGES.unparsable(key, entry.license)];
      return verdict.value ? [] : [LICENCE_MESSAGES.notAllowed(key, entry.license)];
    });
};
