"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PdfUpload } from "./pdf-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight } from "lucide-react";

export function SessionForm() {
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [backgroundText, setBackgroundText] = useState("");
  const [reportTarget, setReportTarget] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePdfExtract = (text: string) => {
    setBackgroundText((prev) => prev + "\n\n--- PDF Content ---\n" + text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, backgroundText, reportTarget }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "セッションの作成に失敗しました");
      }

      const { sessionId } = await response.json();

      // Save to LocalStorage
      const sessions = JSON.parse(
        localStorage.getItem("sonar_sessions") || "[]"
      );
      sessions.unshift({
        id: sessionId,
        purpose,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(
        "sonar_sessions",
        JSON.stringify(sessions.slice(0, 20))
      );

      router.push(`/session/${sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="purpose">
          明確にしたいこと・言語化したいこと
        </Label>
        <textarea
          id="purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="例：転職を考えているが、自分が本当に求めている働き方を整理したい"
          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background"
          rows={3}
          required
        />
      </div>

      <div>
        <Label htmlFor="background">
          背景情報（任意）
        </Label>
        <textarea
          id="background"
          value={backgroundText}
          onChange={(e) => setBackgroundText(e.target.value)}
          placeholder="関連する情報や文脈があれば入力してください"
          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background"
          rows={6}
        />
      </div>

      <PdfUpload onExtract={handlePdfExtract} />

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
          />
          詳細設定
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-6">
          <div>
            <Label htmlFor="reportTarget">
              回答数
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              何問回答したらレポートを生成するかを設定します。
            </p>
            <select
              id="reportTarget"
              value={reportTarget}
              onChange={(e) => setReportTarget(Number(e.target.value))}
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
            >
              {Array.from({ length: 19 }, (_, i) => (i + 1) * 5).map((n) => (
                <option key={n} value={n}>
                  {n}問{n === 25 ? "（デフォルト）" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !purpose.trim()}
        className="w-full py-3"
      >
        {isSubmitting ? "セッションを作成中..." : "セッションを開始する"}
      </Button>
    </form>
  );
}
