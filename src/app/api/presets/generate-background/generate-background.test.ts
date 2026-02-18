import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema extracted from route.ts
const generateBackgroundSchema = z.object({
  title: z.string().max(200).optional(),
  purpose: z.string().min(1, "目的を入力してください").max(5000),
});

// Prompt builder extracted from route.ts
function buildBackgroundPrompt(purpose: string, title?: string): string {
  return `あなたはアンケート設計の専門家です。
ユーザーが設定した「目的」をもとに、アンケート回答者に共有すべき背景情報を生成してください。

${title ? `## タイトル\n${title}\n` : ""}## ユーザーの目的
${purpose}

## 背景情報の設計指針

### 内容
- アンケートのテーマについて、回答者が前提として知っておくべき情報をまとめてください
- 客観的な事実・状況説明を中心にし、特定の立場に誘導しないでください
- 回答者が「なぜこのアンケートが行われているか」を理解できる程度の情報量にしてください

### 形式
- 200〜400文字程度
- 箇条書きではなく、読みやすい文章形式
- 専門用語は避け、一般的な言葉で記述

## 出力形式
以下のJSON形式のみで出力してください。説明文は不要です。

{
  "backgroundText": "生成された背景情報テキスト"
}`;
}

describe("generateBackgroundSchema", () => {
  it("purposeのみで有効", () => {
    expect(generateBackgroundSchema.safeParse({ purpose: "テスト目的" }).success).toBe(true);
  });

  it("title + purposeで有効", () => {
    expect(generateBackgroundSchema.safeParse({ title: "タイトル", purpose: "テスト" }).success).toBe(true);
  });

  it("purposeが空の場合は拒否", () => {
    const result = generateBackgroundSchema.safeParse({ purpose: "" });
    expect(result.success).toBe(false);
  });

  it("purposeがない場合は拒否", () => {
    expect(generateBackgroundSchema.safeParse({}).success).toBe(false);
  });

  it("purposeが5000文字超は拒否", () => {
    expect(generateBackgroundSchema.safeParse({ purpose: "a".repeat(5001) }).success).toBe(false);
  });

  it("titleが200文字超は拒否", () => {
    expect(generateBackgroundSchema.safeParse({ purpose: "OK", title: "a".repeat(201) }).success).toBe(false);
  });
});

describe("buildBackgroundPrompt", () => {
  it("titleなしではタイトルセクションを含まない", () => {
    const prompt = buildBackgroundPrompt("テスト目的");
    expect(prompt).toContain("テスト目的");
    expect(prompt).not.toContain("## タイトル");
  });

  it("titleありではタイトルセクションを含む", () => {
    const prompt = buildBackgroundPrompt("テスト目的", "テストタイトル");
    expect(prompt).toContain("## タイトル");
    expect(prompt).toContain("テストタイトル");
    expect(prompt).toContain("テスト目的");
  });

  it("JSON出力形式の指示を含む", () => {
    const prompt = buildBackgroundPrompt("目的");
    expect(prompt).toContain('"backgroundText"');
  });
});
