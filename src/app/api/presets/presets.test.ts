import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schemas extracted from route.ts
const scaleConfigSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  minLabel: z.string().max(50).optional(),
  maxLabel: z.string().max(50).optional(),
});

const fixedQuestionSchema = z.object({
  statement: z.string().min(1).max(500),
  detail: z.string().max(1000),
  options: z.array(z.string().max(200)).max(10).default([]),
  question_type: z.enum(['radio', 'checkbox', 'dropdown', 'text', 'textarea', 'scale']).default('radio'),
  scale_config: scaleConfigSchema.nullable().optional(),
}).refine((q) => {
  if (q.question_type === 'text' || q.question_type === 'textarea') return true;
  return q.options.length >= 2;
}, { message: "選択肢は2つ以上必要です" });

const createPresetSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  purpose: z.string().min(1, "目的を入力してください").max(5000),
  backgroundText: z.string().max(50000).optional(),
  reportInstructions: z.string().max(10000).optional(),
  keyQuestions: z.array(z.string().max(500)).max(20).optional(),
  fixedQuestions: z.array(fixedQuestionSchema).max(50).optional(),
  explorationThemes: z.array(z.string().max(500)).max(20).optional(),
  reportTarget: z.number().int().min(5).refine((v) => v % 5 === 0, {
    message: "回答数は5の倍数で指定してください",
  }).optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
});

describe("scaleConfigSchema", () => {
  it("有効なスケール設定を受け付ける", () => {
    expect(scaleConfigSchema.safeParse({ min: 1, max: 5, minLabel: "不満", maxLabel: "満足" }).success).toBe(true);
  });

  it("ラベルなしでも有効", () => {
    expect(scaleConfigSchema.safeParse({ min: 1, max: 10 }).success).toBe(true);
  });

  it("min/maxが小数の場合は拒否", () => {
    expect(scaleConfigSchema.safeParse({ min: 1.5, max: 5 }).success).toBe(false);
  });

  it("ラベルが50文字超の場合は拒否", () => {
    expect(scaleConfigSchema.safeParse({ min: 1, max: 5, minLabel: "a".repeat(51) }).success).toBe(false);
  });
});

describe("fixedQuestionSchema", () => {
  it("radio質問で2選択肢以上なら有効", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "テスト質問",
      detail: "詳細",
      options: ["はい", "いいえ"],
    });
    expect(result.success).toBe(true);
  });

  it("radio質問で1選択肢は拒否（2つ以上必要）", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "テスト質問",
      detail: "詳細",
      options: ["はい"],
    });
    expect(result.success).toBe(false);
  });

  it("text質問は選択肢なしでも有効", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "自由記述",
      detail: "詳細",
      options: [],
      question_type: "text",
    });
    expect(result.success).toBe(true);
  });

  it("textarea質問は選択肢なしでも有効", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "自由記述",
      detail: "詳細",
      options: [],
      question_type: "textarea",
    });
    expect(result.success).toBe(true);
  });

  it("checkbox質問で2選択肢以上なら有効", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "テスト",
      detail: "",
      options: ["A", "B", "C"],
      question_type: "checkbox",
    });
    expect(result.success).toBe(true);
  });

  it("scale質問でscale_configを含む場合有効", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "満足度",
      detail: "",
      options: ["1", "2", "3", "4", "5"],
      question_type: "scale",
      scale_config: { min: 1, max: 5 },
    });
    expect(result.success).toBe(true);
  });

  it("statementが空の場合は拒否", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "",
      detail: "",
      options: ["A", "B"],
    });
    expect(result.success).toBe(false);
  });

  it("statementが500文字超の場合は拒否", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "a".repeat(501),
      detail: "",
      options: ["A", "B"],
    });
    expect(result.success).toBe(false);
  });

  it("不正なquestion_typeは拒否", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "テスト",
      detail: "",
      options: ["A", "B"],
      question_type: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPresetSchema", () => {
  const validPreset = {
    title: "テストアンケート",
    purpose: "テスト目的",
  };

  it("最小限のフィールドで有効", () => {
    expect(createPresetSchema.safeParse(validPreset).success).toBe(true);
  });

  it("全フィールドありで有効", () => {
    const result = createPresetSchema.safeParse({
      ...validPreset,
      backgroundText: "背景情報",
      reportInstructions: "レポート指示",
      keyQuestions: ["問い1", "問い2"],
      explorationThemes: ["テーマ1"],
      reportTarget: 15,
      ogTitle: "OGタイトル",
      ogDescription: "OG説明",
    });
    expect(result.success).toBe(true);
  });

  it("titleが空の場合は拒否", () => {
    expect(createPresetSchema.safeParse({ title: "", purpose: "目的" }).success).toBe(false);
  });

  it("purposeが空の場合は拒否", () => {
    expect(createPresetSchema.safeParse({ title: "タイトル", purpose: "" }).success).toBe(false);
  });

  it("reportTargetが5の倍数でない場合は拒否", () => {
    expect(createPresetSchema.safeParse({ ...validPreset, reportTarget: 7 }).success).toBe(false);
    expect(createPresetSchema.safeParse({ ...validPreset, reportTarget: 13 }).success).toBe(false);
  });

  it("reportTargetが5の倍数なら有効", () => {
    expect(createPresetSchema.safeParse({ ...validPreset, reportTarget: 5 }).success).toBe(true);
    expect(createPresetSchema.safeParse({ ...validPreset, reportTarget: 10 }).success).toBe(true);
    expect(createPresetSchema.safeParse({ ...validPreset, reportTarget: 25 }).success).toBe(true);
  });

  it("reportTargetが5未満は拒否", () => {
    expect(createPresetSchema.safeParse({ ...validPreset, reportTarget: 3 }).success).toBe(false);
  });

  it("keyQuestionsが20個超は拒否", () => {
    const result = createPresetSchema.safeParse({
      ...validPreset,
      keyQuestions: Array.from({ length: 21 }, (_, i) => `Q${i}`),
    });
    expect(result.success).toBe(false);
  });
});
