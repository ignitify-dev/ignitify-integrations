// Stop on cancel. A run's cancel arrives as SIGTERM (SIGINT locally). Node's default is to exit at
// once, which leaves child processes, servers and half-done work behind, so long-running code takes
// the signals over while it works and gives them back after.

const STOP_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

export interface ProcessStop {
  /** Aborts on the first SIGTERM or SIGINT. */
  readonly signal: AbortSignal;
  /** Give the signals back. Call it in `finally`. */
  readonly release: () => void;
}

/** An AbortSignal for the process stop signals, until `release()`. */
export const processStop = (): ProcessStop => {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  STOP_SIGNALS.forEach((name) => process.once(name, abort));
  return { signal: controller.signal, release: () => STOP_SIGNALS.forEach((name) => process.off(name, abort)) };
};
