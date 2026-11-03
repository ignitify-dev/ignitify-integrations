// A minimal fake Bot API for tests: a node:http server on loopback that records each request and
// answers from a script. No Telegram server runs locally, so this is the contract test.

import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface Recorded {
  readonly method: string;
  readonly path: string;
  readonly contentType: string;
  readonly body: Buffer;
}

export type Reply =
  | { readonly status?: number; readonly json: unknown }
  | { readonly status?: number; readonly raw: string | Buffer }
  | { readonly drop: true }
  | { readonly hold: true };

export interface FakeBotApi {
  readonly root: string;
  readonly requests: Recorded[];
  close(): Promise<void>;
}

const readBody = async (request: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
};

/** The JSON of a Bot API success. */
export const success = (result: unknown): Reply => ({ json: { ok: true, result } });

/** The JSON of a Bot API error. */
export const failed = (status: number, description: string, parameters?: Record<string, number>): Reply => ({
  status,
  json: { ok: false, error_code: status, description, ...(parameters === undefined ? {} : { parameters }) },
});

export const fakeBotApi = async (script: (request: Recorded, index: number) => Reply): Promise<FakeBotApi> => {
  const requests: Recorded[] = [];
  const server = createServer((request, response) => {
    void readBody(request).then((body) => {
      const recorded: Recorded = {
        method: request.method ?? '',
        path: request.url ?? '',
        contentType: request.headers['content-type'] ?? '',
        body,
      };
      requests.push(recorded);
      const reply = script(recorded, requests.length - 1);
      if ('hold' in reply) return;
      if ('drop' in reply) {
        request.socket.destroy();
        return;
      }
      response.statusCode = reply.status ?? 200;
      if ('json' in reply) {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify(reply.json));
      } else response.end(reply.raw);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    root: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

/** The JSON body of a recorded request. */
export const jsonOf = (request: Recorded | undefined): Record<string, unknown> =>
  JSON.parse(request?.body.toString('utf8') ?? 'null') as Record<string, unknown>;

/** The multipart form of a recorded request, parsed by the platform's own parser. */
export const formOf = (request: Recorded | undefined): Promise<FormData> =>
  new Request('http://local/', {
    method: 'POST',
    headers: { 'content-type': request?.contentType ?? '' },
    body: request?.body ?? null,
  }).formData();
