import { getPagination } from "../utils/pagination";

function req(q: Record<string, string>) {
  return { query: q } as any;
}

describe("getPagination", () => {
  test("defaults to page=1 limit=20 when no query", () => {
    const { page, limit, skip } = getPagination(req({}));
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(skip).toBe(0);
  });

  test("parses provided page and limit", () => {
    const { page, limit, skip } = getPagination(req({ page: "3", limit: "25" }));
    expect(page).toBe(3);
    expect(limit).toBe(25);
    expect(skip).toBe(50);
  });

  test("caps limit at 100", () => {
    const { limit } = getPagination(req({ limit: "10000" }));
    expect(limit).toBe(100);
  });

  test("limit=0 falls back to default 20 (parseInt('0') is falsy)", () => {
    const { limit } = getPagination(req({ limit: "0" }));
    expect(limit).toBe(20);
  });

  test("negative limit is floored to 1", () => {
    const { limit } = getPagination(req({ limit: "-3" }));
    expect(limit).toBe(1);
  });

  test("floors page at 1", () => {
    const { page, skip } = getPagination(req({ page: "-5" }));
    expect(page).toBe(1);
    expect(skip).toBe(0);
  });

  test("rejects non-numeric and falls back to default", () => {
    const { page, limit } = getPagination(req({ page: "abc", limit: "xyz" }));
    expect(page).toBe(1);
    expect(limit).toBe(20);
  });
});
