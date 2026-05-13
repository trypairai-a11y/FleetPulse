// Phase 6 Wave 0 RED — Turns GREEN as soon as Task 2 lands (Task 2 extends
// the lint:tenant scope to cover services/ingest/**; this test proves the
// no-prisma-without-tenant rule fires on the broken fixture).
//
// REQ-ingest-adapter-layer / Pitfall 3 prevention: cross-tenant data leak
// gating must work on the new services/ingest/ scope from day one.

import { spawnSync } from "child_process";
import * as path from "path";

describe("Phase 6 / REQ-ingest-adapter-layer: lint:tenant rule fires on services/ingest/** scope", () => {
  test("ESLint with no-prisma-without-tenant against the broken fixture exits non-zero", () => {
    const backendDir = path.resolve(__dirname, "../../../..");
    const fixture = "src/__tests__/services/ingest/_lint_negative.fixture.ts.txt";

    const result = spawnSync(
      "npx",
      [
        "eslint",
        "--rulesdir",
        "./eslint-rules",
        "--no-eslintrc",
        "--resolve-plugins-relative-to",
        ".",
        "--parser",
        "@typescript-eslint/parser",
        "--parser-options",
        "ecmaVersion:2022,sourceType:module",
        "--rule",
        '{"no-prisma-without-tenant":"error"}',
        "--no-error-on-unmatched-pattern",
        fixture,
      ],
      { cwd: backendDir, encoding: "utf8" },
    );

    // The lint rule MUST fire on the broken pattern (findFirst without tenantId
    // in the where clause). Non-zero exit OR a diagnostic in stdout/stderr.
    const output = (result.stdout || "") + (result.stderr || "");
    expect(
      result.status !== 0 ||
        /no-prisma-without-tenant/.test(output) ||
        /tenantId/i.test(output),
    ).toBe(true);
  });
});

// RED — turned GREEN by Task 2 (lint:tenant scope extension). File contains
// "lint:tenant" pin.
