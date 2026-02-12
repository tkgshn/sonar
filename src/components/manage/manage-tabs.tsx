"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { SurveyReportSection } from "@/components/admin/survey-report-section";
import { SonarLogo } from "@/components/ui/sonar-logo";
import { AuthHeader } from "@/components/auth/auth-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const POLLING_INTERVAL_MS = 10_000;
const AUTO_SAVE_DELAY_MS = 2_000;

const TABS = [
  { id: "questions", label: "質問" },
  { id: "responses", label: "回答" },
  { id: "settings", label: "設定" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// --- Types ---

interface SessionInfo {
  id: string;
  title: string | null;
  status: string;
  current_question_index: number;
  created_at: string;
}

interface ResponseInfo {
  session_id: string;
  question_index: number;
  statement: string;
  selected_option: number;
  options: string[];
  free_text: string | null;
}

interface ReportInfo {
  session_id: string;
  report_text: string;
}

interface SurveyReportInfo {
  id: string;
  preset_id: string;
  version: number;
  report_text: string;
  custom_instructions: string | null;
  status: "generating" | "completed" | "failed";
  created_at: string;
}

interface AdminData {
  preset: {
    id: string;
    slug: string;
    title: string;
    purpose: string;
    created_at: string;
  };
  sessions: SessionInfo[];
  responses: ResponseInfo[];
  reports: ReportInfo[];
  surveyReports: SurveyReportInfo[];
}

interface FixedQuestionInput {
  statement: string;
  detail: string;
  options: string[];
}

export interface ManageTabsProps {
  token: string;
  userEmail: string | null;
  preset: {
    slug: string;
    title: string;
    purpose: string;
    background_text: string | null;
    report_instructions: string | null;
    report_target: number;
    key_questions: string[];
    fixed_questions: FixedQuestionInput[];
    exploration_themes: string[];
  };
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// --- Main Component ---

export function ManageTabs({ token, userEmail, preset }: ManageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("questions");

  // Editing state
  const [title, setTitle] = useState(preset.title);
  const [purpose, setPurpose] = useState(preset.purpose);
  const [backgroundText, setBackgroundText] = useState(
    preset.background_text ?? ""
  );
  const [reportInstructions, setReportInstructions] = useState(
    preset.report_instructions ?? ""
  );
  const themes =
    preset.exploration_themes?.length > 0
      ? preset.exploration_themes
      : preset.key_questions ?? [];
  const [keyQuestions, setKeyQuestions] = useState<string[]>(themes);
  const [fixedQuestions, setFixedQuestions] = useState<FixedQuestionInput[]>(
    preset.fixed_questions ?? []
  );
  const [reportTarget, setReportTarget] = useState(preset.report_target);

  // Admin data state
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [surveyReports, setSurveyReports] = useState<SurveyReportInfo[]>([]);
  const [showQR, setShowQR] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchingRef = useRef(false);

  // --- Auto-save ---
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-fresh field snapshot via ref (avoids stale closures)
  const fieldsRef = useRef<Record<string, unknown>>({});
  fieldsRef.current = {
    title,
    purpose,
    background_text: backgroundText || null,
    report_instructions: reportInstructions || null,
    key_questions: keyQuestions.filter((q) => q.trim()),
    exploration_themes: keyQuestions.filter((q) => q.trim()),
    fixed_questions: fixedQuestions
      .filter((q) => q.statement.trim())
      .map((q) => ({ ...q, options: q.options.filter((o) => o.trim()) }))
      .filter((q) => q.options.length >= 2),
    report_target: reportTarget,
  };

  const saveAll = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/admin/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldsRef.current),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(
        () => setSaveStatus((s) => (s === "saved" ? "idle" : s)),
        3000
      );
    } catch {
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [token]);

  // Debounced auto-save on any field change
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    // Reset "saved" indicator when user starts editing again
    setSaveStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveAll(), AUTO_SAVE_DELAY_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    purpose,
    backgroundText,
    reportInstructions,
    keyQuestions,
    fixedQuestions,
    reportTarget,
    saveAll,
  ]);

  // Immediate save on blur
  const handleBlurSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!savingRef.current && initializedRef.current) saveAll();
  }, [saveAll]);

  // --- Data polling ---
  const fetchData = useCallback(
    async (isInitial: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const response = await fetch(`/api/admin/${token}`);
        if (!response.ok) {
          if (response.status === 404)
            throw new Error("管理画面が見つかりません。");
          throw new Error("データの取得に失敗しました");
        }
        const json = await response.json();
        setData(json);
        setError(null);
        setSurveyReports(json.surveyReports || []);
      } catch (err) {
        if (isInitial) {
          setError(
            err instanceof Error ? err.message : "予期せぬエラーが発生しました"
          );
        }
      } finally {
        fetchingRef.current = false;
        if (isInitial) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchData(true);
    intervalRef.current = setInterval(
      () => fetchData(false),
      POLLING_INTERVAL_MS
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const handleSurveyReportGenerated = (report: SurveyReportInfo) => {
    setSurveyReports((prev) => [report, ...prev]);
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-3">読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || "データの取得に失敗しました"}
        </div>
      </div>
    );
  }

  const { sessions, responses, reports } = data;
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const surveyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/preset/${preset.slug}`
      : `/preset/${preset.slug}`;

  return (
    <div>
      {/* Google Forms–style header */}
      <header className="flex items-center gap-3 py-3 mb-1">
        <SonarLogo className="shrink-0" />
        <span className="text-base font-semibold text-[var(--foreground)] truncate">
          {title || "無題のアンケート"}
        </span>

        {/* Save status indicator */}
        <SaveStatusIndicator status={saveStatus} />

        <div className="flex-1" />

        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={surveyUrl} label="リンクをコピー" />
          <button
            type="button"
            onClick={() => setShowQR(!showQR)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${showQR ? "text-blue-700 bg-blue-50 border-blue-200" : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"}`}
          >
            QR
          </button>
          <ThemeToggle />
          {userEmail ? (
            <AuthHeader email={userEmail} />
          ) : (
            <a
              href="/login"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              ログイン
            </a>
          )}
        </div>
      </header>

      {showQR && (
        <div className="flex justify-center py-4 mb-2 bg-white rounded-lg border border-gray-200">
          <QRCodeSVG value={surveyUrl} size={140} />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex justify-center border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.id === "responses" && completedSessions.length > 0 && (
              <span className="ml-1 text-xs">
                ({completedSessions.length})
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "questions" && (
        <QuestionsEditTab
          title={title}
          setTitle={setTitle}
          purpose={purpose}
          setPurpose={setPurpose}
          backgroundText={backgroundText}
          setBackgroundText={setBackgroundText}
          keyQuestions={keyQuestions}
          setKeyQuestions={setKeyQuestions}
          fixedQuestions={fixedQuestions}
          setFixedQuestions={setFixedQuestions}
          onBlur={handleBlurSave}
        />
      )}

      {activeTab === "responses" && (
        <ResponsesTab
          token={token}
          sessions={completedSessions}
          responses={responses}
          reports={reports}
          surveyReports={surveyReports}
          completedCount={completedSessions.length}
          onReportGenerated={handleSurveyReportGenerated}
        />
      )}

      {activeTab === "settings" && (
        <SettingsEditTab
          reportTarget={reportTarget}
          setReportTarget={setReportTarget}
          reportInstructions={reportInstructions}
          setReportInstructions={setReportInstructions}
          onBlur={handleBlurSave}
        />
      )}
    </div>
  );
}

// --- Save Status Indicator ---

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0">
        <span className="inline-block w-3 h-3 border-1.5 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        保存済み
      </span>
    );
  }

  // error
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-500 shrink-0">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      保存に失敗
    </span>
  );
}

// --- 質問タブ (Editable) ---

function QuestionsEditTab({
  title,
  setTitle,
  purpose,
  setPurpose,
  backgroundText,
  setBackgroundText,
  keyQuestions,
  setKeyQuestions,
  fixedQuestions,
  setFixedQuestions,
  onBlur,
}: {
  title: string;
  setTitle: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
  backgroundText: string;
  setBackgroundText: (v: string) => void;
  keyQuestions: string[];
  setKeyQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  fixedQuestions: FixedQuestionInput[];
  setFixedQuestions: React.Dispatch<React.SetStateAction<FixedQuestionInput[]>>;
  onBlur: () => void;
}) {
  const [isGeneratingKeyQuestions, setIsGeneratingKeyQuestions] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const generateKeyQuestions = async () => {
    if (!purpose.trim()) return;
    setIsGeneratingKeyQuestions(true);
    setGenError(null);
    try {
      const response = await fetch("/api/presets/generate-key-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, backgroundText: backgroundText || undefined }),
      });
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        throw new Error(d.error || "項目の生成に失敗しました");
      }
      const { keyQuestions: generated } = await response.json();
      setKeyQuestions(generated);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setIsGeneratingKeyQuestions(false);
    }
  };

  const generateBackground = async () => {
    if (!purpose.trim()) return;
    setIsGeneratingBackground(true);
    setGenError(null);
    try {
      const response = await fetch("/api/presets/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || undefined, purpose }),
      });
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        throw new Error(d.error || "背景情報の生成に失敗しました");
      }
      const { backgroundText: generated } = await response.json();
      setBackgroundText(generated);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const updateKeyQuestion = (index: number, value: string) => {
    setKeyQuestions((prev) => { const u = [...prev]; u[index] = value; return u; });
  };
  const removeKeyQuestion = (index: number) => {
    setKeyQuestions((prev) => prev.filter((_, i) => i !== index));
  };
  const addKeyQuestion = () => setKeyQuestions((prev) => [...prev, ""]);
  const moveKeyQuestion = (from: number, to: number) => {
    if (from === to) return;
    setKeyQuestions((prev) => { const u = [...prev]; const [m] = u.splice(from, 1); u.splice(to, 0, m); return u; });
  };

  const addFixedQuestion = () => setFixedQuestions((prev) => [...prev, { statement: "", detail: "", options: ["", ""] }]);
  const removeFixedQuestion = (index: number) => setFixedQuestions((prev) => prev.filter((_, i) => i !== index));
  const updateFixedQuestion = (index: number, field: keyof FixedQuestionInput, value: string) => {
    setFixedQuestions((prev) => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  };
  const updateFixedQuestionOption = (qIndex: number, oIndex: number, value: string) => {
    setFixedQuestions((prev) => { const u = [...prev]; const o = [...u[qIndex].options]; o[oIndex] = value; u[qIndex] = { ...u[qIndex], options: o }; return u; });
  };
  const addFixedQuestionOption = (qIndex: number) => {
    setFixedQuestions((prev) => { const u = [...prev]; u[qIndex] = { ...u[qIndex], options: [...u[qIndex].options, ""] }; return u; });
  };
  const removeFixedQuestionOption = (qIndex: number, oIndex: number) => {
    setFixedQuestions((prev) => { const u = [...prev]; u[qIndex] = { ...u[qIndex], options: u[qIndex].options.filter((_, i) => i !== oIndex) }; return u; });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Section 1: 回答者に表示される情報 */}
      <fieldset className="space-y-5 rounded-xl border border-green-200 bg-green-50/30 p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-green-800">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          回答者に表示される情報
        </legend>

        <div>
          <label htmlFor="edit-title" className="block text-sm font-medium text-gray-900 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input id="edit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={onBlur}
            placeholder="例：新サービスのコンセプトについて"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white" required />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="edit-background" className="block text-sm font-medium text-gray-900">
              説明文 <span className="text-xs font-normal text-gray-500">任意</span>
            </label>
            <button type="button" onClick={generateBackground} disabled={isGeneratingBackground || !purpose.trim()}
              className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isGeneratingBackground ? "生成中..." : "AIで生成"}
            </button>
          </div>
          <p className="text-xs text-green-700/70 mb-2">回答開始前に回答者に表示される前提情報です。</p>
          <textarea id="edit-background" value={backgroundText} onChange={(e) => setBackgroundText(e.target.value)} onBlur={onBlur}
            placeholder="例：サービスの概要、ターゲットユーザー、競合との違いなど"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-white" rows={4} />
        </div>
      </fieldset>

      {/* Section 2: 固定質問 */}
      <fieldset className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-blue-800">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          固定質問
          <span className="text-xs font-normal text-blue-600">全員に共通で聞く質問</span>
        </legend>

        <p className="text-xs text-blue-700/70">
          全回答者に同じ質問を出します。これに加えて、AIが各回答者に合わせた深掘り質問を自動追加します。
        </p>

        {fixedQuestions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-gray-400 mt-2 shrink-0">Q{qIndex + 1}</span>
              <div className="flex-1 space-y-2">
                <input type="text" value={q.statement} onChange={(e) => updateFixedQuestion(qIndex, "statement", e.target.value)} onBlur={onBlur}
                  placeholder="質問文を入力..." className="w-full px-3 py-2 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm bg-transparent" />
                <input type="text" value={q.detail} onChange={(e) => updateFixedQuestion(qIndex, "detail", e.target.value)} onBlur={onBlur}
                  placeholder="補足説明（任意）" className="w-full px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100 focus:border-blue-300 focus:outline-none bg-transparent" />
              </div>
              <button type="button" onClick={() => removeFixedQuestion(qIndex)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-1" title="質問を削除">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
            <div className="space-y-1.5 pl-7">
              {q.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                  <input type="text" value={option} onChange={(e) => updateFixedQuestionOption(qIndex, oIndex, e.target.value)} onBlur={onBlur}
                    placeholder={`選択肢 ${oIndex + 1}`} className="flex-1 px-2 py-1.5 text-sm border-b border-gray-100 focus:border-blue-400 focus:outline-none bg-transparent" />
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => removeFixedQuestionOption(qIndex, oIndex)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 10 && (
                <button type="button" onClick={() => addFixedQuestionOption(qIndex)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 shrink-0" />
                  選択肢を追加
                </button>
              )}
            </div>
          </div>
        ))}

        <button type="button" onClick={addFixedQuestion}
          className="w-full py-3 border-2 border-dashed border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors">
          + 質問を追加
        </button>
      </fieldset>

      {/* Section 3: AI深掘り設定 */}
      <fieldset className="space-y-5 rounded-xl border border-purple-200 bg-purple-50/30 p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-purple-800">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          AI深掘り設定
          <span className="text-xs font-normal text-purple-600">回答者には表示されません</span>
        </legend>

        <div>
          <label htmlFor="edit-purpose" className="block text-sm font-medium text-gray-900 mb-1">
            深掘りの目的 <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-purple-700/70 mb-2">AIがこの目的に沿って、各回答者に合わせた追加質問を自動生成します。</p>
          <textarea id="edit-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} onBlur={onBlur}
            placeholder="例：新しく開発中のサービスのコンセプトに対する率直な意見を聞きたい。"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white" rows={3} required />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-900">
              探索テーマ <span className="text-xs font-normal text-gray-500">任意</span>
            </label>
            <button type="button" onClick={generateKeyQuestions} disabled={isGeneratingKeyQuestions || !purpose.trim()}
              className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isGeneratingKeyQuestions ? "生成中..." : "AIで生成"}
            </button>
          </div>
          <p className="text-xs text-purple-700/70 mb-3">AIが深掘りする際に重点的に探索するテーマです。</p>

          {keyQuestions.length > 0 && (
            <div className="space-y-1 mb-3">
              {keyQuestions.map((question, index) => (
                <div key={index} draggable
                  onDragStart={() => { setDragIndex(index); dragCounter.current = 0; }}
                  onDragEnd={() => { if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) moveKeyQuestion(dragIndex, dragOverIndex); setDragIndex(null); setDragOverIndex(null); dragCounter.current = 0; }}
                  onDragEnter={() => { dragCounter.current++; setDragOverIndex(index); }}
                  onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setDragOverIndex((p) => p === index ? null : p); }}
                  onDragOver={(e) => e.preventDefault()}
                  className={`flex gap-1.5 items-start rounded-lg transition-colors ${dragIndex === index ? "opacity-40" : dragOverIndex === index && dragIndex !== null ? "bg-purple-50 ring-1 ring-purple-200" : ""}`}>
                  <div className="mt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0" title="ドラッグで並び替え">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500 mt-3 min-w-[1.25rem] text-right">{index + 1}.</span>
                  <textarea value={question} onChange={(e) => updateKeyQuestion(index, e.target.value)} onBlur={onBlur}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
                    rows={3} style={{ fieldSizing: "content" } as React.CSSProperties} placeholder="探索テーマを入力..." />
                  <button type="button" onClick={() => removeKeyQuestion(index)} className="mt-2 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="削除">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addKeyQuestion} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">+ テーマを追加</button>
        </div>
      </fieldset>

      {genError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{genError}</div>
      )}
    </div>
  );
}

// --- 回答タブ ---

function ResponsesTab({ token, sessions, responses, reports, surveyReports, completedCount, onReportGenerated }: {
  token: string; sessions: SessionInfo[]; responses: ResponseInfo[]; reports: ReportInfo[];
  surveyReports: SurveyReportInfo[]; completedCount: number; onReportGenerated: (report: SurveyReportInfo) => void;
}) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
          <p className="text-sm text-gray-500">回答数</p>
        </div>
      </div>

      <SurveyReportSection token={token} surveyReports={surveyReports} sessions={sessions} responses={responses} onReportGenerated={onReportGenerated} />

      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">回答一覧（{sessions.length}件）</h2>
        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">URLを共有して回答を集めましょう。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, idx) => {
              const sr = responses.filter((r) => r.session_id === session.id);
              const rpt = reports.find((r) => r.session_id === session.id);
              const open = expandedSession === session.id;
              return (
                <div key={session.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => setExpandedSession(open ? null : session.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">回答 #{idx + 1}</p>
                      <p className="text-xs text-gray-500">{new Date(session.created_at).toLocaleString("ja-JP")} / {session.current_question_index}問回答</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {open && (
                    <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                      {sr.length > 0 ? (
                        <div className="space-y-2">
                          {sr.sort((a, b) => a.question_index - b.question_index).map((r, i) => (
                            <div key={i} className="text-sm border border-gray-100 rounded-lg p-3">
                              <p className="text-gray-500 text-xs mb-1">Q{r.question_index}. {r.statement}</p>
                              <p className="text-gray-900">{r.selected_option >= r.options.length && r.free_text ? r.free_text : r.options[r.selected_option] ?? `選択肢 ${r.selected_option}`}</p>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-gray-500">回答データがありません</p>}
                      {rpt && (
                        <Link href={`/report/${session.id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800" target="_blank">
                          レポートを表示
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- 設定タブ (Editable) ---

function SettingsEditTab({ reportTarget, setReportTarget, reportInstructions, setReportInstructions, onBlur }: {
  reportTarget: number; setReportTarget: (v: number) => void;
  reportInstructions: string; setReportInstructions: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <fieldset className="space-y-5 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          詳細設定
        </legend>

        <div>
          <label htmlFor="edit-reportTarget" className="block text-sm font-medium text-gray-900 mb-1">質問数（レポート生成まで）</label>
          <p className="text-xs text-gray-500 mb-2">AIが自動生成する質問の数です。この数に達するとレポートが生成されます。</p>
          <select id="edit-reportTarget" value={reportTarget} onChange={(e) => setReportTarget(Number(e.target.value))} onBlur={onBlur}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            {Array.from({ length: 19 }, (_, i) => (i + 1) * 5).map((n) => (
              <option key={n} value={n}>{n}問{n === 25 ? "（デフォルト）" : ""}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-reportInstructions" className="block text-sm font-medium text-gray-900 mb-1">
            レポートのカスタマイズ <span className="text-xs font-normal text-gray-500">任意</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">回答完了後にAIが自動生成するレポートへの追加指示です。</p>
          <textarea id="edit-reportInstructions" value={reportInstructions} onChange={(e) => setReportInstructions(e.target.value)} onBlur={onBlur}
            placeholder="例：賛否が分かれたポイントを重点的にまとめてほしい"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white" rows={3} />
        </div>
      </fieldset>
    </div>
  );
}

// --- Shared UI ---

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* fallback */ }
  };

  if (label) {
    return (
      <button type="button" onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {copied ? "コピーしました" : label}
      </button>
    );
  }

  return (
    <button type="button" onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded shrink-0" title="URLをコピー">
      {copied ? (
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
        </svg>
      )}
    </button>
  );
}
