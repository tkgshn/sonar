import { describe, it, expect } from "vitest";
import { getPreset, getPresetMetadata } from "./index";

describe("getPreset — ハードコードプリセット", () => {
  it("存在するslugでプリセットを返す", () => {
    const preset = getPreset("2026-shugiin-election");
    expect(preset).not.toBeNull();
    expect(preset!.title).toBeDefined();
    expect(preset!.purpose).toBeDefined();
  });

  it("存在しないslugでnullを返す", () => {
    expect(getPreset("non-existent")).toBeNull();
  });

  it("空文字のslugでnullを返す", () => {
    expect(getPreset("")).toBeNull();
  });
});

describe("getPresetMetadata — OGPメタデータ", () => {
  it("存在するslugでメタデータを返す", () => {
    const meta = getPresetMetadata("2026-shugiin-election");
    expect(meta).not.toBeNull();
    expect(meta!.ogTitle).toBeDefined();
    expect(meta!.ogDescription).toBeDefined();
  });

  it("存在しないslugでnullを返す", () => {
    expect(getPresetMetadata("non-existent")).toBeNull();
  });
});
