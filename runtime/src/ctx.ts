// The `ctx` an ignitify Node task receives as `run(payload, ctx)`'s second argument.
// It mirrors the platform's Node runtime shim. Logs are NOT on ctx: the shim routes
// `console.*`, so integrations log with `console`.

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface TaskCallback {
  /** Public HTTPS URL of this run's callback route; its origin is the deployment's public host. */
  readonly url: string;
  /** Verify a received callback. Pass the RAW body, never a re-serialised object. */
  verify(body: string | Uint8Array, signature: string): boolean;
}

export interface TaskCtx {
  /** Secret values by name, as declared in task.yaml `secrets:`. */
  readonly secrets: Readonly<Record<string, string>>;
  /** Stream a progress frame to the caller (at most 10 KiB each). */
  chunk(data: unknown): void;
  /** Tell the platform the inbound listener is up (bidirectional tasks). */
  ready(): void;
  metric(name: string, value: number, type?: MetricType, attrs?: Readonly<Record<string, string>>): void;
  /** `null` when the run has no callback (no bidirectional network). */
  readonly callback: TaskCallback | null;
}
