/**
 * Parity gate: runs scripts/check-parity.mjs (the field-for-field comparison of the bundled
 * snapshot against the read-only reference data) and requires a clean exit.
 * One source of truth: the script is also run directly by `npm run data:parity`.
 */

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('bundled snapshot parity', () => {
  it('matches the reference data exactly', () => {
    // Resolved from the project root: under jsdom `import.meta.url` is not a file: URL.
    const script = resolve(process.cwd(), 'scripts/check-parity.mjs');
    const output = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    expect(output).toContain('data:parity OK');
    expect(output).toContain('436 institutions');
    expect(output).toContain('4225 courses');
  }, 60_000);
});
