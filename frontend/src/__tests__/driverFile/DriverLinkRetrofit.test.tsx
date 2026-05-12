// Wave 0 RED test — turns GREEN in Wave 2 when the 14-site retrofit sweep lands.
// REQ-driver-file (canonical /drivers/:id route).

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const FRONTEND_SRC = join(process.cwd(), "src");
const LEGACY_HREF_PATTERN = /\/(keeta|talabat|deliveroo|americana)\/drivers\/[`$\{a-zA-Z0-9_]/;
const ALLOWLIST: RegExp[] = [
  /^app\/\(dashboard\)\/(keeta|talabat|deliveroo|americana)\/drivers\/\[id\]\/page\.tsx$/,
  /^__tests__\//,
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walk(path);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      yield path;
    }
  }
}

describe("DriverLink retrofit completeness (RED — Wave 2)", () => {
  it("no legacy /{platform}/drivers/${id} hrefs remain outside allowlisted files", () => {
    const offenders: string[] = [];
    for (const file of walk(FRONTEND_SRC)) {
      const rel = relative(FRONTEND_SRC, file);
      if (ALLOWLIST.some((p) => p.test(rel))) continue;
      const content = readFileSync(file, "utf8");
      if (LEGACY_HREF_PATTERN.test(content)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
