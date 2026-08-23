// Web Storage is not guaranteed to be reachable from the client entry.
//
// The Facebook Instant Games bundle runs src/main.ts in an IFRAME on an
// fbsbx.com origin (docs/facebook-release.md), so every storage access there is
// third-party. A browser that BLOCKS third-party storage does not hand back an
// empty box: `window.localStorage` becomes an accessor that throws on the
// reference itself, so a bare `localStorage.getItem(...)` throws where it
// stands. The severity depends entirely on where the access sits, and one of
// them sat at MODULE SCOPE, which means the whole client entry failed to
// evaluate and the container showed nothing at all.
//
// The rule this pins is the one that makes the placement question moot: in
// src/main.ts every localStorage/sessionStorage dereference is inside a try
// block, or goes through the shared probe (src/ui/safe_local_storage.ts), whose
// return value is an ordinary object nothing has to guard again.
//
// Walked as an AST rather than grepped: the file is full of the WORD
// localStorage in prose and in one string literal, and the thing that matters
// is whether a dereference is lexically inside a `try`, which no line-based
// scan can see.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ENTRY = 'src/main.ts';
const STORAGE_GLOBALS = new Set(['localStorage', 'sessionStorage']);

interface Access {
  line: number;
  text: string;
  guarded: boolean;
}

function storageAccesses(relPath: string): Access[] {
  const source = readFileSync(resolve(process.cwd(), relPath), 'utf8').replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true);
  const found: Access[] = [];

  const insideTryBlock = (node: ts.Node): boolean => {
    for (let cur = node.parent, child: ts.Node = node; cur; child = cur, cur = cur.parent) {
      if (ts.isTryStatement(cur) && cur.tryBlock === child) return true;
    }
    return false;
  };

  const visit = (node: ts.Node): void => {
    // `localStorage.getItem(...)`, `sessionStorage.setItem(...)`: the GLOBAL is
    // the expression being dereferenced. `window.localStorage` is a different
    // node shape (the global is the NAME) and is not this hazard: reading it
    // through `window` is what the shared probe already does under a try.
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      STORAGE_GLOBALS.has(node.expression.text)
    ) {
      found.push({
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        text: node.getText(sf),
        guarded: insideTryBlock(node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe('client entry storage access survives a blocked third-party context', () => {
  const accesses = storageAccesses(ENTRY);

  it('finds real accesses to judge, so the guard below is not vacuous', () => {
    // The floor sits just under the real count (22 at the time of writing), not
    // at zero: a walk that quietly narrowed to a handful would still clear a
    // loose floor while saying nothing about the rest of the file.
    expect(accesses.length).toBeGreaterThanOrEqual(20);
  });

  it('guards every localStorage and sessionStorage dereference in src/main.ts', () => {
    const bare = accesses.filter((a) => !a.guarded).map((a) => `${ENTRY}:${a.line}  ${a.text}`);
    expect(bare).toEqual([]);
  });
});
