// Secret naming: the ONE rule shared by the manifest schema (core uses its source) and by
// integrations (which read names from ctx.secrets).

import type { TaskCtx } from './ctx.js';
import { err, ok, type Result } from './result.js';

/** Secret names are upper snake case. */
export const SECRET_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const SECRET_MESSAGES = {
  missing: (name: string) =>
    `secret ${name} is not set: declare it in task.yaml "secrets:" and set it with "ignitify secret:set ${name} --stdin"`,
} as const;

/** Read one secret, or explain how to set it. Never returns or logs the value of another secret. */
export const readSecret = (ctx: Pick<TaskCtx, 'secrets'>, name: string): Result<string> => {
  const value = ctx.secrets[name];
  return value === undefined || value === '' ? err(SECRET_MESSAGES.missing(name)) : ok(value);
};
