/**
 * In-memory SQLite mock for jest-expo unit tests.
 *
 * The real expo-sqlite returns a Database object with execAsync/runAsync/getAllAsync.
 * The mock simulates enough of those primitives for the outbox tests:
 *   - CREATE TABLE no-ops (we track schema implicitly via the in-memory store)
 *   - INSERT OR IGNORE INTO outbox VALUES(...) — enforces UNIQUE constraint on
 *     idempotencyKey column. Duplicate idempotencyKey silently no-ops.
 *   - SELECT * FROM outbox WHERE attempts < ? — returns ordered rows
 *   - UPDATE outbox SET attempts = attempts + 1 WHERE id = ?
 *   - DELETE FROM outbox WHERE id IN (?)
 *
 * Test helpers (NOT in the real expo-sqlite surface):
 *   - __resetDb() — clears all rows
 *   - __seedRow(row) — inserts a row directly, bypassing UNIQUE checks
 *   - __allRows() — returns the full table for assertions
 */

export type OutboxRow = {
  id: number;
  idempotencyKey: string;
  payload: string;
  attempts: number;
  createdAt: number;
};

let nextId = 1;
const rows: OutboxRow[] = [];

export function __resetDb(): void {
  rows.length = 0;
  nextId = 1;
}

export function __allRows(): OutboxRow[] {
  return rows.map((r) => ({ ...r }));
}

export function __seedRow(row: Partial<OutboxRow> & { idempotencyKey: string }): OutboxRow {
  const r: OutboxRow = {
    id: row.id ?? nextId++,
    idempotencyKey: row.idempotencyKey,
    payload: row.payload ?? "{}",
    attempts: row.attempts ?? 0,
    createdAt: row.createdAt ?? Date.now(),
  };
  rows.push(r);
  return r;
}

function parseStmt(
  sql: string,
  params: any[] | undefined,
): { kind: string; args: any[] } {
  const norm = sql.replace(/\s+/g, " ").trim().toUpperCase();
  return { kind: norm, args: params ?? [] };
}

type DatabaseLike = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, ...params: any[]) => Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync: <T = any>(sql: string, ...params: any[]) => Promise<T[]>;
  getFirstAsync: <T = any>(sql: string, ...params: any[]) => Promise<T | null>;
  closeAsync: () => Promise<void>;
};

function makeDb(): DatabaseLike {
  return {
    execAsync: jest.fn(async (_sql: string) => {
      // CREATE TABLE / CREATE INDEX → no-op; the in-memory store is schemaless.
    }),
    runAsync: jest.fn(async (sql: string, ...params: any[]) => {
      const norm = sql.replace(/\s+/g, " ").trim().toUpperCase();
      // INSERT OR IGNORE INTO OUTBOX ... — enforce UNIQUE on idempotencyKey
      if (norm.startsWith("INSERT OR IGNORE INTO OUTBOX") || norm.startsWith("INSERT INTO OUTBOX")) {
        // Params order convention (set by outbox.ts in Wave 1): [idempotencyKey, payload]
        const [idempotencyKey, payload] = params;
        const ignoreOnConflict = norm.startsWith("INSERT OR IGNORE");
        const dup = rows.find((r) => r.idempotencyKey === idempotencyKey);
        if (dup) {
          if (ignoreOnConflict) {
            return { changes: 0, lastInsertRowId: 0 };
          }
          throw new Error("UNIQUE constraint failed: outbox.idempotencyKey");
        }
        const id = nextId++;
        rows.push({
          id,
          idempotencyKey,
          payload: payload ?? "{}",
          attempts: 0,
          createdAt: Date.now(),
        });
        return { changes: 1, lastInsertRowId: id };
      }
      // UPDATE OUTBOX SET ATTEMPTS = ATTEMPTS + 1 WHERE ID IN (...)
      if (norm.startsWith("UPDATE OUTBOX SET ATTEMPTS")) {
        const ids = params.flat();
        let changes = 0;
        for (const r of rows) {
          if (ids.includes(r.id)) {
            r.attempts += 1;
            changes++;
          }
        }
        return { changes, lastInsertRowId: 0 };
      }
      // DELETE FROM OUTBOX WHERE ID IN (...)
      if (norm.startsWith("DELETE FROM OUTBOX")) {
        const ids = params.flat();
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (ids.includes(rows[i].id)) rows.splice(i, 1);
        }
        return { changes: before - rows.length, lastInsertRowId: 0 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }),
    getAllAsync: jest.fn(async (sql: string, ..._params: any[]) => {
      const norm = sql.replace(/\s+/g, " ").trim().toUpperCase();
      // SELECT ... FROM OUTBOX WHERE ATTEMPTS < ? ORDER BY CREATEDAT ASC LIMIT ?
      if (norm.startsWith("SELECT") && norm.includes("FROM OUTBOX") && norm.includes("ATTEMPTS")) {
        // Default cutoff 5
        const cutoff = 5;
        const matching = rows.filter((r) => r.attempts < cutoff);
        return matching.slice().sort((a, b) => a.createdAt - b.createdAt) as any;
      }
      if (norm.startsWith("SELECT") && norm.includes("FROM OUTBOX")) {
        return rows.slice() as any;
      }
      return [] as any;
    }),
    getFirstAsync: jest.fn(async (sql: string) => {
      const norm = sql.replace(/\s+/g, " ").trim().toUpperCase();
      if (norm.startsWith("SELECT COUNT") && norm.includes("FROM OUTBOX")) {
        return { count: rows.length } as any;
      }
      return null as any;
    }),
    closeAsync: jest.fn(async () => {}),
  };
}

export const openDatabaseAsync = jest.fn(async (_name: string) => makeDb());
export const openDatabaseSync = jest.fn((_name: string) => makeDb());

export default {
  openDatabaseAsync,
  openDatabaseSync,
  __resetDb,
  __allRows,
  __seedRow,
};
