import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

describe('CI push coverage', () => {
  it('runs QA for pushes to every branch while retaining the release tier', () => {
    const triggers = workflow.match(/^on:\s*\r?\n([\s\S]*?)^permissions:/m)?.[1];

    expect(triggers).toBeDefined();
    expect(triggers).toMatch(/^ {2}push:\s*$/m);
    expect(triggers).not.toMatch(/^ {2}push:\s*\r?\n\s+branches:/m);
    expect(workflow).toContain(
      "github.event_name == 'push' && !startsWith(github.ref, 'refs/heads/release/')",
    );
    expect(workflow).toContain(
      "github.event_name == 'push' && startsWith(github.ref, 'refs/heads/release/')",
    );
  });
});
