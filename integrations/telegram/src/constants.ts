// Names, limits and messages of telegram.
//
// Every Bot API fact below was checked on 2026-11-02 against the Bot API docs shipped inside
// @grammyjs/types 5.0.0, which mirror https://core.telegram.org/bots/api. The quote is next to each.

/** The default secret, as the manifest declares it. A second bot passes `token`. */
export const SECRET_BOT_TOKEN = 'TELEGRAM_BOT_TOKEN';

/** The one host of the manifest's `egress_allow`: the Bot API and its file links. */
export const API_HOST = 'api.telegram.org';
export const API_ROOT = `https://${API_HOST}`;
/** Telegram's test environment: `/bot<token>/test/<method>`. Checked in the live test before release. */
export const TEST_ENVIRONMENT_SEGMENT = '/test';

/** "Text of the message to be sent, 1-4096 characters after entities parsing". */
export const TEXT_MAX = 4096;
/** "Caption of the photo to be sent, 0-1024 characters after entities parsing". */
export const CAPTION_MAX = 1024;
/** "For the moment, bots can download files of up to 20MB in size". */
export const DOWNLOAD_MAX_BYTES = 20 * 1024 * 1024;
/** "Bots can currently send files of any type of up to 50 MB in size". */
export const UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

/** The methods whose `text` is message text (1-4096). Other methods use `text` for shorter things. */
export const TEXT_METHODS: readonly string[] = ['sendMessage', 'editMessageText'];
/** Bot API method names are letters only. Anything else could change the request path. */
export const METHOD_PATTERN = /^[A-Za-z]+$/;
/** A token goes into the URL path, so it must not hold a path separator or whitespace. */
export const TOKEN_UNSAFE = /[/\s?#]/;

/**
 * Methods that are safe to send twice. Only these are retried after a 5xx, a network error or a
 * timeout: a send that may have reached Telegram is never repeated.
 */
export const SAFE_METHOD_PREFIX = 'get';
export const SAFE_METHODS: readonly string[] = ['setWebhook', 'deleteWebhook'];

export const RETRY_MAX_DEFAULT = 3;
/** A 429 that asks for a longer wait comes back as an error with `retryAfterSec`, never a hang. */
export const RETRY_WAIT_MAX_SEC_DEFAULT = 30;
/** Backoff before retrying a safe method after a 5xx or network error: base * 2^attempt. */
export const RETRY_BACKOFF_BASE_MS = 500;
/** One request, including an upload of up to 50 MB. A long poll adds its own `timeout` to this. */
export const CALL_TIMEOUT_MS = 60_000;
export const MS_PER_SEC = 1000;
/** The long-poll method: its own `timeout` (seconds) is added to the call timeout. */
export const LONG_POLL_METHOD = 'getUpdates';
/** The name a file download goes by in its errors. */
export const DOWNLOAD_LABEL = 'download';
export const HIGH_SURROGATE_MIN = 0xd800;
export const HIGH_SURROGATE_MAX = 0xdbff;

export const HTTP_TOO_MANY_REQUESTS = 429;
export const HTTP_SERVER_ERROR_MIN = 500;
export const HTTPS = 'https:';
export const HTTP = 'http:';
/** `http:` is accepted for a loopback test server only: the token would go in clear. */
export const LOOPBACK_HOSTS: readonly string[] = ['127.0.0.1', 'localhost', '[::1]'];

export const DISK_FILE_KIND = 'disk-file';
export const ATTACH_PREFIX = 'attach://';
export const ATTACH_NAME_PREFIX = 'f';
/**
 * Top-level file fields that must still go as `attach://`: "Thumbnails can't be reused and can be only
 * uploaded as a new file, so you can pass attach://<file_attach_name>" (the same for a video `cover`).
 */
export const ATTACH_ONLY_FIELDS: readonly string[] = ['thumbnail', 'cover'];
export const JSON_HEADERS = { 'content-type': 'application/json' } as const;

/** Split points of long plain text, best first. A hard cut is the last resort. */
export const SPLIT_SEPARATORS: readonly string[] = ['\n\n', '\n', ' '];
/** A separator in the last part of the window (past this fraction of it) is preferred. */
export const SPLIT_PREFER_AFTER = 0.5;
/** "In all other places characters ... must be escaped with the preceding character '\'". */
export const MARKDOWN_V2_SPECIAL = /[_*[\]()~`>#+\-=|{}.!\\]/g;
export const HTML_SPECIAL = /[&<>]/g;
export const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export const MESSAGES = {
  badToken: 'the bot token is malformed: it must be non-empty, with no "/", "?", "#" or whitespace',
  badApiRoot: (root: string) => `apiRoot "${root}" must be an https origin, or an http origin on loopback for tests`,
  badEnvironment: (value: string) => `environment "${value}" must be "prod" or "test"`,
  badCount: (name: string, value: number) => `${name} ${value} must be a whole number of 0 or more`,
  badMethod: 'the method name must be letters only',
  textEmpty: 'text must not be empty',
  textTooLong: (length: number) =>
    `text is ${length} characters; one message takes at most ${TEXT_MAX} (use sendText to split plain text)`,
  captionTooLong: (length: number) => `caption is ${length} characters; at most ${CAPTION_MAX}`,
  fileUnreadable: (path: string, code: string) => `file ${path} cannot be read (${code})`,
  fileTooLarge: (path: string, size: number) =>
    `file ${path} is ${size} bytes; a bot uploads at most ${UPLOAD_MAX_BYTES} bytes (50 MB)`,
  downloadTooLarge: (size: number) =>
    `the file is ${size} bytes; a bot downloads at most ${DOWNLOAD_MAX_BYTES} bytes (20 MB)`,
  notAFile: 'not a regular file',
  noFilePath: 'getFile returned no file_path, so the file cannot be downloaded',
  writeFailed: (path: string, code: string) => `writing ${path} failed (${code})`,
  http: (status: number, description: string) => `HTTP ${status}: ${description}`,
  notBotApi: 'the response is not Bot API JSON',
  network: (code: string) => `network error (${code})`,
  timeout: (ms: number) => `no answer within ${ms} ms`,
  aborted: 'stopped',
  failed: (method: string, detail: string) => `telegram ${method}: ${detail}`,
} as const;
