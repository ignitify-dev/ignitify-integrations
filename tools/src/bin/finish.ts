// Shared ending of every bin: print the issues and exit 1, or print the OK line.

import { CLI_MESSAGES } from '../messages.js';

export const finish = (issues: readonly string[], okLine: string): void => {
  if (issues.length === 0) {
    console.log(okLine);
    return;
  }
  console.error([CLI_MESSAGES.issues(issues.length), ...issues.map((issue) => `  - ${issue}`)].join('\n'));
  process.exitCode = 1;
};
