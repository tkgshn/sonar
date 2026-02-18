import { describe, it, expect } from "vitest";
import { z } from "zod";

const generateReportSchema = z.object({
  sessionId: z.string().uuid(),
});

// Version calculation logic extracted from route.ts
function calcNextVersion(
  existingReports: Array<{ version: number }> | null
): number {
  return existingReports && existingReports.length > 0
    ? existingReports[0].version + 1
    : 1;
}

// Minimum QA check
function hasEnoughAnswers(allQA: Array<unknown>): boolean {
  return allQA.length >= 5;
}

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("generateReportSchema", () => {
  it("有効なUUIDを受け付ける", () => {
    expect(generateReportSchema.safeParse({ sessionId: validUuid }).success).toBe(true);
  });

  it("不正なUUIDは拒否", () => {
    expect(generateReportSchema.safeParse({ sessionId: "bad" }).success).toBe(false);
  });

  it("sessionIdがない場合は拒否", () => {
    expect(generateReportSchema.safeParse({}).success).toBe(false);
  });
});

describe("calcNextVersion — バージョン管理", () => {
  it("初回レポートはversion=1", () => {
    expect(calcNextVersion(null)).toBe(1);
    expect(calcNextVersion([])).toBe(1);
  });

  it("既存version=1ならnext=2", () => {
    expect(calcNextVersion([{ version: 1 }])).toBe(2);
  });

  it("既存version=5ならnext=6", () => {
    expect(calcNextVersion([{ version: 5 }])).toBe(6);
  });
});

describe("hasEnoughAnswers — 最低回答数チェック", () => {
  it("5問以上でtrue", () => {
    expect(hasEnoughAnswers([1, 2, 3, 4, 5])).toBe(true);
    expect(hasEnoughAnswers([1, 2, 3, 4, 5, 6, 7])).toBe(true);
  });

  it("5問未満でfalse", () => {
    expect(hasEnoughAnswers([1, 2, 3, 4])).toBe(false);
    expect(hasEnoughAnswers([])).toBe(false);
  });

  it("ちょうど5問でtrue", () => {
    expect(hasEnoughAnswers(new Array(5).fill(null))).toBe(true);
  });
});
