import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema extracted from admin/[token]/route.ts
const updatePresetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  purpose: z.string().min(1).max(5000).optional(),
  background_text: z.string().max(50000).nullable().optional(),
  report_instructions: z.string().max(10000).nullable().optional(),
  key_questions: z.array(z.string().max(500)).max(20).optional(),
  exploration_themes: z.array(z.string().max(500)).max(20).optional(),
  fixed_questions: z
    .array(
      z.object({
        statement: z.string().min(1).max(500),
        detail: z.string().max(1000),
        options: z.array(z.string().max(200)).max(10).default([]),
        question_type: z.enum(['radio', 'checkbox', 'dropdown', 'text', 'textarea', 'scale']).default('radio'),
        scale_config: z.object({
          min: z.number().int(),
          max: z.number().int(),
          minLabel: z.string().max(50).optional(),
          maxLabel: z.string().max(50).optional(),
        }).nullable().optional(),
      }).refine((q) => {
        if (q.question_type === 'text' || q.question_type === 'textarea') return true;
        return q.options.length >= 2;
      }, { message: "選択肢は2つ以上必要です" })
    )
    .max(50)
    .optional(),
  report_target: z
    .number()
    .int()
    .min(5)
    .refine((v) => v % 5 === 0, { message: "回答数は5の倍数で指定してください" })
    .optional(),
  notification_email: z.string().email().nullable().optional(),
});

describe("updatePresetSchema — 部分更新", () => {
  it("空オブジェクトは有効（部分更新なので）", () => {
    expect(updatePresetSchema.safeParse({}).success).toBe(true);
  });

  it("titleのみの更新が有効", () => {
    expect(updatePresetSchema.safeParse({ title: "新タイトル" }).success).toBe(true);
  });

  it("purposeのみの更新が有効", () => {
    expect(updatePresetSchema.safeParse({ purpose: "新目的" }).success).toBe(true);
  });

  it("background_textをnullに設定可能", () => {
    expect(updatePresetSchema.safeParse({ background_text: null }).success).toBe(true);
  });

  it("report_instructionsをnullに設定可能", () => {
    expect(updatePresetSchema.safeParse({ report_instructions: null }).success).toBe(true);
  });

  it("notification_emailが有効なメールアドレスなら通る", () => {
    expect(updatePresetSchema.safeParse({ notification_email: "test@example.com" }).success).toBe(true);
  });

  it("notification_emailをnullに設定可能", () => {
    expect(updatePresetSchema.safeParse({ notification_email: null }).success).toBe(true);
  });

  it("notification_emailが不正な形式は拒否", () => {
    expect(updatePresetSchema.safeParse({ notification_email: "not-email" }).success).toBe(false);
  });

  it("report_targetが5の倍数なら有効", () => {
    expect(updatePresetSchema.safeParse({ report_target: 10 }).success).toBe(true);
    expect(updatePresetSchema.safeParse({ report_target: 25 }).success).toBe(true);
  });

  it("report_targetが5の倍数でないなら拒否", () => {
    expect(updatePresetSchema.safeParse({ report_target: 7 }).success).toBe(false);
  });

  it("report_targetが5未満は拒否", () => {
    expect(updatePresetSchema.safeParse({ report_target: 3 }).success).toBe(false);
  });

  it("fixed_questionsのradio質問で1選択肢は拒否", () => {
    const result = updatePresetSchema.safeParse({
      fixed_questions: [{
        statement: "テスト",
        detail: "",
        options: ["唯一の選択肢"],
      }],
    });
    expect(result.success).toBe(false);
  });

  it("fixed_questionsのtext質問は選択肢なしでも有効", () => {
    const result = updatePresetSchema.safeParse({
      fixed_questions: [{
        statement: "自由記述",
        detail: "",
        options: [],
        question_type: "text",
      }],
    });
    expect(result.success).toBe(true);
  });

  it("titleが空文字の場合は拒否", () => {
    expect(updatePresetSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("purposeが空文字の場合は拒否", () => {
    expect(updatePresetSchema.safeParse({ purpose: "" }).success).toBe(false);
  });

  it("複合更新が有効", () => {
    const result = updatePresetSchema.safeParse({
      title: "更新タイトル",
      purpose: "更新目的",
      report_target: 15,
      notification_email: "admin@example.com",
      key_questions: ["問い1", "問い2"],
    });
    expect(result.success).toBe(true);
  });
});
