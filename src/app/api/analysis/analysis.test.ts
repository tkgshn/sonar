import { describe, it, expect } from "vitest";
import { z } from "zod";

const generateAnalysisSchema = z.object({
  sessionId: z.string().uuid(),
  batchIndex: z.number().int().min(1),
  startIndex: z.number().int().min(1),
  endIndex: z.number().int().min(1),
});

// Unanswered check logic extracted from route.ts
function hasUnanswered(
  batchQA: Array<{
    questionType: string;
    selectedOption: number | null;
    selectedOptions: number[] | null;
    answerText: string | null;
  }>
): boolean {
  return batchQA.some((q) => {
    const qt = q.questionType || "radio";
    if (qt === "text" || qt === "textarea") return !q.answerText;
    if (qt === "checkbox")
      return !q.selectedOptions || q.selectedOptions.length === 0;
    return q.selectedOption === null || q.selectedOption === undefined;
  });
}

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("generateAnalysisSchema", () => {
  it("有効なリクエストを受け付ける", () => {
    const result = generateAnalysisSchema.safeParse({
      sessionId: validUuid,
      batchIndex: 1,
      startIndex: 1,
      endIndex: 5,
    });
    expect(result.success).toBe(true);
  });

  it("batchIndex=0は拒否", () => {
    const result = generateAnalysisSchema.safeParse({
      sessionId: validUuid,
      batchIndex: 0,
      startIndex: 1,
      endIndex: 5,
    });
    expect(result.success).toBe(false);
  });

  it("startIndex=0は拒否", () => {
    const result = generateAnalysisSchema.safeParse({
      sessionId: validUuid,
      batchIndex: 1,
      startIndex: 0,
      endIndex: 5,
    });
    expect(result.success).toBe(false);
  });

  it("不正なUUIDは拒否", () => {
    const result = generateAnalysisSchema.safeParse({
      sessionId: "invalid",
      batchIndex: 1,
      startIndex: 1,
      endIndex: 5,
    });
    expect(result.success).toBe(false);
  });

  it("小数のbatchIndexは拒否", () => {
    const result = generateAnalysisSchema.safeParse({
      sessionId: validUuid,
      batchIndex: 1.5,
      startIndex: 1,
      endIndex: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("hasUnanswered — 未回答チェックロジック", () => {
  it("全問radio回答済みならfalse", () => {
    expect(
      hasUnanswered([
        { questionType: "radio", selectedOption: 0, selectedOptions: null, answerText: null },
        { questionType: "radio", selectedOption: 2, selectedOptions: null, answerText: null },
      ])
    ).toBe(false);
  });

  it("radio未回答があればtrue", () => {
    expect(
      hasUnanswered([
        { questionType: "radio", selectedOption: 0, selectedOptions: null, answerText: null },
        { questionType: "radio", selectedOption: null, selectedOptions: null, answerText: null },
      ])
    ).toBe(true);
  });

  it("text回答済みならfalse", () => {
    expect(
      hasUnanswered([
        { questionType: "text", selectedOption: null, selectedOptions: null, answerText: "回答" },
      ])
    ).toBe(false);
  });

  it("text未回答ならtrue", () => {
    expect(
      hasUnanswered([
        { questionType: "text", selectedOption: null, selectedOptions: null, answerText: null },
      ])
    ).toBe(true);
  });

  it("checkbox回答済みならfalse", () => {
    expect(
      hasUnanswered([
        { questionType: "checkbox", selectedOption: null, selectedOptions: [0, 2], answerText: null },
      ])
    ).toBe(false);
  });

  it("checkbox空配列ならtrue", () => {
    expect(
      hasUnanswered([
        { questionType: "checkbox", selectedOption: null, selectedOptions: [], answerText: null },
      ])
    ).toBe(true);
  });

  it("混合質問タイプで全回答済みならfalse", () => {
    expect(
      hasUnanswered([
        { questionType: "radio", selectedOption: 1, selectedOptions: null, answerText: null },
        { questionType: "text", selectedOption: null, selectedOptions: null, answerText: "テスト" },
        { questionType: "checkbox", selectedOption: null, selectedOptions: [0], answerText: null },
        { questionType: "scale", selectedOption: 3, selectedOptions: null, answerText: null },
      ])
    ).toBe(false);
  });

  it("混合質問タイプで1つ未回答ならtrue", () => {
    expect(
      hasUnanswered([
        { questionType: "radio", selectedOption: 1, selectedOptions: null, answerText: null },
        { questionType: "textarea", selectedOption: null, selectedOptions: null, answerText: null },
      ])
    ).toBe(true);
  });
});
