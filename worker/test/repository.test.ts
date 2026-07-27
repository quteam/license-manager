import { describe, expect, it } from "vitest";
import { buildActivationCodeInsertStatement, buildDashboardActiveTrendStatement } from "../src/repository";

describe("repository SQL helpers", () => {
  it("builds one multi-row activation code insert statement", () => {
    const statement = buildActivationCodeInsertStatement(
      [
        {
          batchId: 1,
          appDbId: 2,
          planId: 3,
          codeHash: "hash-a",
          codeSuffix: "SUFFA",
          createdBy: 4
        },
        {
          batchId: 1,
          appDbId: 2,
          planId: 3,
          codeHash: "hash-b",
          codeSuffix: "SUFFB",
          createdBy: 4
        }
      ],
      "2026-06-25T00:00:00.000Z"
    );

    expect(statement.sql.match(/INSERT INTO activation_codes/g)).toHaveLength(1);
    expect(statement.sql.match(/\(\?, \?, \?, \?, \?, 'unused', NULL, NULL, NULL, \?, \?\)/g)).toHaveLength(2);
    expect(statement.bindings).toEqual([
      1,
      2,
      3,
      "hash-a",
      "SUFFA",
      4,
      "2026-06-25T00:00:00.000Z",
      1,
      2,
      3,
      "hash-b",
      "SUFFB",
      4,
      "2026-06-25T00:00:00.000Z"
    ]);
  });

  it("builds one active trend query with bound dates", () => {
    const statement = buildDashboardActiveTrendStatement(["2026-06-23", "2026-06-24"], 7);

    expect(statement.sql).toContain("WITH trend_dates(date, next_date) AS (VALUES (?, ?), (?, ?))");
    expect(statement.sql).toContain("LEFT JOIN activation_codes c");
    expect(statement.sql).toContain("c.activated_at < d.next_date");
    expect(statement.sql).toContain("c.expires_at IS NULL OR c.expires_at >= d.next_date");
    expect(statement.bindings).toEqual(["2026-06-23", "2026-06-24", "2026-06-24", "2026-06-25", 7]);
  });
});
