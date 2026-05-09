/**
 * ESLint configuration for backend/.
 *
 * Active rules:
 *   - local-rules/no-prisma-without-tenant — enforces tenantId in Prisma where clauses
 *     for the 35 tenant-scoped models. Static-analysis complement to the runtime
 *     guard in `src/config/prismaExtensions.ts`. (REQ-tenant-scoped-everything.)
 *
 * The rule loads via `eslint-plugin-local-rules`, which exposes any module
 * under `eslint-rules/index.js` as `local-rules/<ruleName>`.
 *
 * Two ways to invoke:
 *   - `npm run lint`         — uses this config (loads plugin)
 *   - `npm run lint:tenant`  — bypasses plugin via `--rulesdir eslint-rules`,
 *                              referencing the rule by short name. Useful for
 *                              CI scoping to a subdirectory.
 */

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "local-rules"],
  rules: {
    "local-rules/no-prisma-without-tenant": "error",
  },
  ignorePatterns: [
    "dist/",
    "src/generated/",
    "node_modules/",
    "eslint-rules/__tests__/",
  ],
};
