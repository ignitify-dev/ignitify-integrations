// The one result type of this repo: a decision either succeeds with a value or fails with
// reasons. A discriminated union, so the compiler forces every caller to check `ok`.

export type Result<T, E = string> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Unwrap a result whose failure is a programming or setup error, not a value to branch on. */
export const unwrap = <T>(result: Result<T, string | readonly string[]>): T => {
  if (result.ok) return result.value;
  throw new Error(typeof result.error === 'string' ? result.error : result.error.join('\n'));
};
