/**
 * Meta-tests for the `no-prisma-without-tenant` ESLint rule.
 *
 * Run with:   node --test backend/eslint-rules/__tests__/no-prisma-without-tenant.test.js
 *   or:       cd backend && node --test eslint-rules/__tests__/
 *
 * Uses ESLint v8's RuleTester (parserOptions). When the project upgrades to
 * ESLint v9, swap to `languageOptions: { ecmaVersion, sourceType }`.
 */

"use strict";

const { RuleTester } = require("eslint");
const rule = require("../no-prisma-without-tenant");

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("no-prisma-without-tenant", rule, {
  // ─── VALID — rule should NOT fire ─────────────────────────────────────
  valid: [
    {
      // tenantId at the top level
      code: "prisma.driver.findMany({ where: { tenantId } });",
    },
    {
      // tenantId aliased from a context object
      code: "prisma.driver.findMany({ where: { tenantId: ctx.tenantId, status: 'ACTIVE' } });",
    },
    {
      // AND-scoped tenantId
      code: "prisma.agentAction.findMany({ where: { AND: [{ tenantId }, { toolName: 'x' }] } });",
    },
    {
      // OR-scoped tenantId — every branch carries it
      code: "prisma.driver.findMany({ where: { OR: [{ tenantId, name: 'a' }, { tenantId, name: 'b' }] } });",
    },
    {
      // User is not in TENANT_SCOPED_MODELS — rule must not fire
      code: "prisma.user.findMany({ where: { email: 'x' } });",
    },
    {
      // create takes `data`, not `where`; not in SCOPED_OPS
      code: "prisma.driver.create({ data: { tenantId } });",
    },
    {
      // updateMany WITH tenantId is fine
      code: "prisma.driver.updateMany({ where: { tenantId }, data: { status: 'INACTIVE' } });",
    },
    {
      // performanceSnapshot.upsert — `upsert` is not in SCOPED_OPS
      code: "prisma.performanceSnapshot.upsert({ where: { id: 'x' }, create: {}, update: {} });",
    },
    {
      // Spread args — rule cannot reason statically; intentionally lets it through
      code: "prisma.driver.findMany(args);",
    },
    {
      // Disable comment honoured — should produce zero reports
      code: "// eslint-disable-next-line no-prisma-without-tenant\nprisma.driver.findMany({ where: { status: 'ACTIVE' } });",
    },
  ],

  // ─── INVALID — rule SHOULD fire ────────────────────────────────────────
  invalid: [
    {
      code: "prisma.driver.findMany({ where: { status: 'ACTIVE' } });",
      errors: [{ messageId: "missingTenantId" }],
    },
    {
      code: "prisma.agentAction.findMany({ where: {} });",
      errors: [{ messageId: "missingTenantId" }],
    },
    {
      code: "prisma.performanceSnapshot.aggregate({ where: { driverId: 'x' } });",
      errors: [{ messageId: "missingTenantId" }],
    },
    {
      // No where clause at all
      code: "prisma.metricEvent.findMany({});",
      errors: [{ messageId: "missingWhere" }],
    },
    {
      // No args at all
      code: "prisma.agentMemory.findMany();",
      errors: [{ messageId: "missingWhere" }],
    },
    {
      // OR scoping where one branch is missing tenantId — must fail
      code: "prisma.driver.findMany({ where: { OR: [{ tenantId, name: 'a' }, { name: 'b' }] } });",
      errors: [{ messageId: "missingTenantId" }],
    },
    {
      // updateMany without tenantId
      code: "prisma.driver.updateMany({ where: { status: 'INACTIVE' }, data: {} });",
      errors: [{ messageId: "missingTenantId" }],
    },
    {
      // pinnedView.findMany without where
      code: "prisma.pinnedView.findMany();",
      errors: [{ messageId: "missingWhere" }],
    },
    {
      // Empty AND array → cannot prove tenantId, must fail
      code: "prisma.alert.findMany({ where: { AND: [] } });",
      errors: [{ messageId: "missingTenantId" }],
    },
  ],
});

// `node --test` requires at least one explicit test — use a sentinel.
// RuleTester throws synchronously on its first invalid case if anything
// regresses, but wrap it in node:test to get a clean PASS line.
const { test } = require("node:test");
test("RuleTester executed without throwing", () => {
  // No-op: if the file loaded to this point, all RuleTester cases passed.
});
