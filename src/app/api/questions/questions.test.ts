import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema extracted from questions/generate/route.ts
const generateQuestionsSchema = z.object({
  sessionId: z.string().uuid(),
  startIndex: z.number().int().min(1),
  endIndex: z.number().int().min(1),
});

// Fixed question filtering logic extracted from route.ts
function getFixedQuestionsInBatch(
  fixedQuestions: Array<{ statement: string }>,
  startIndex: number,
  endIndex: number
): Array<{ index: number; statement: string }> {
  const result: Array<{ index: number; statement: string }> = [];
  for (let i = 0; i < fixedQuestions.length; i++) {
    const fixedIndex = i + 1; // fixed questions are 1-indexed
    if (fixedIndex >= startIndex && fixedIndex <= endIndex) {
      result.push({ index: fixedIndex, statement: fixedQuestions[i].statement });
    }
  }
  return result;
}

// AI slots calculation logic extracted from route.ts
function getAiSlotsNeeded(
  startIndex: number,
  endIndex: number,
  fixedIndices: Set<number>,
  existingIndices: Set<number>
): number[] {
  const slots: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (!fixedIndices.has(i) && !existingIndices.has(i)) {
      slots.push(i);
    }
  }
  return slots;
}

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("generateQuestionsSchema", () => {
  it("有効なリクエストを受け付ける", () => {
    expect(generateQuestionsSchema.safeParse({
      sessionId: validUuid,
      startIndex: 1,
      endIndex: 5,
    }).success).toBe(true);
  });

  it("不正なUUIDは拒否", () => {
    expect(generateQuestionsSchema.safeParse({
      sessionId: "bad",
      startIndex: 1,
      endIndex: 5,
    }).success).toBe(false);
  });

  it("startIndex=0は拒否（min 1）", () => {
    expect(generateQuestionsSchema.safeParse({
      sessionId: validUuid,
      startIndex: 0,
      endIndex: 5,
    }).success).toBe(false);
  });

  it("endIndex=0は拒否（min 1）", () => {
    expect(generateQuestionsSchema.safeParse({
      sessionId: validUuid,
      startIndex: 1,
      endIndex: 0,
    }).success).toBe(false);
  });

  it("小数のstartIndexは拒否", () => {
    expect(generateQuestionsSchema.safeParse({
      sessionId: validUuid,
      startIndex: 1.5,
      endIndex: 5,
    }).success).toBe(false);
  });
});

describe("getFixedQuestionsInBatch — バッチ範囲内の固定質問", () => {
  const fixed = [
    { statement: "Q1" },
    { statement: "Q2" },
    { statement: "Q3" },
    { statement: "Q4" },
    { statement: "Q5" },
  ];

  it("バッチ1-5で全5問が含まれる", () => {
    const result = getFixedQuestionsInBatch(fixed, 1, 5);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ index: 1, statement: "Q1" });
    expect(result[4]).toEqual({ index: 5, statement: "Q5" });
  });

  it("バッチ3-5で3問のみ含まれる", () => {
    const result = getFixedQuestionsInBatch(fixed, 3, 5);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ index: 3, statement: "Q3" });
  });

  it("バッチ6-10では固定質問5問の範囲外", () => {
    const result = getFixedQuestionsInBatch(fixed, 6, 10);
    expect(result).toHaveLength(0);
  });

  it("固定質問が空の場合は空配列", () => {
    expect(getFixedQuestionsInBatch([], 1, 5)).toHaveLength(0);
  });
});

describe("getAiSlotsNeeded — AI質問のスロット計算", () => {
  it("固定質問も既存質問もない場合、全スロットがAI", () => {
    const slots = getAiSlotsNeeded(1, 5, new Set(), new Set());
    expect(slots).toEqual([1, 2, 3, 4, 5]);
  });

  it("固定質問のインデックスは除外される", () => {
    const slots = getAiSlotsNeeded(1, 5, new Set([1, 3]), new Set());
    expect(slots).toEqual([2, 4, 5]);
  });

  it("既存質問のインデックスは除外される", () => {
    const slots = getAiSlotsNeeded(1, 5, new Set(), new Set([2, 4]));
    expect(slots).toEqual([1, 3, 5]);
  });

  it("固定+既存で全てカバーされていれば空", () => {
    const slots = getAiSlotsNeeded(1, 3, new Set([1, 2]), new Set([3]));
    expect(slots).toEqual([]);
  });

  it("固定と既存が重複しても正しく動作", () => {
    const slots = getAiSlotsNeeded(1, 3, new Set([1]), new Set([1, 2]));
    expect(slots).toEqual([3]);
  });
});
