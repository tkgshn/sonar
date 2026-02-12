"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { QuestionCitation } from "./question-citation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronDown } from "lucide-react";

interface QuestionData {
  question_index: number;
  statement: string;
  detail: string;
  options: string[];
  selectedOption: number | null;
  freeText?: string | null;
}

interface ReportViewProps {
  sessionId: string;
  reportText: string;
  version: number;
  questions: QuestionData[];
}

export function ReportView({
  sessionId,
  reportText,
  version,
  questions,
}: ReportViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/report/${sessionId}`;
    const shareData = {
      title: "診断レポート",
      text: "診断レポートをシェアします",
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getAnswerLabel = (question: QuestionData): string | null => {
    if (question.selectedOption === null) return null;
    if (question.selectedOption === 5) {
      const trimmed = question.freeText?.trim();
      return trimmed ? `その他（自由記述）: ${trimmed}` : "その他（自由記述）";
    }
    return question.options[question.selectedOption] ?? null;
  };

  const normalizedReportText = reportText
    .replace(/\*\*([「『])/g, "**\u200b$1")
    .replace(/([」』])\*\*/g, "$1\u200b**");

  const renderTextWithCitations = (text: string): React.ReactNode => {
    const citationSplitRegex = /((?:\[|［)(?:Q)?\d+(?:\]|］))/g;
    const citationMatchRegex = /(?:\[|［)(?:Q)?(\d+)(?:\]|］)/;

    if (!citationMatchRegex.test(text)) return text;

    const parts = text.split(citationSplitRegex);
    return parts.map((part, i) => {
      const match = part.match(citationMatchRegex);
      if (!match) return part;

      const qNum = Number(match[1]);
      const question = questions.find((q) => q.question_index === qNum);
      if (!question) return part;

      return (
        <QuestionCitation
          key={`citation-${qNum}-${i}`}
          questionIndex={qNum}
          statement={question.statement}
          selectedAnswer={getAnswerLabel(question)}
        />
      );
    });
  };

  const renderWithCitations = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      return renderTextWithCitations(node);
    }
    if (Array.isArray(node)) {
      return node.map((child) => renderWithCitations(child));
    }
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
      if (node.type === "code" || node.type === "pre") {
        return node;
      }
      if (!node.props?.children) return node;
      return React.cloneElement(
        node,
        node.props,
        renderWithCitations(node.props.children)
      );
    }
    return node;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">診断レポート</h1>
          <p className="text-sm text-muted-foreground mt-1">バージョン {version}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-full sm:w-auto"
          >
            {copied ? "コピーしました" : "シェア"}
          </Button>
          <Button
            onClick={() => router.push(`/session/${sessionId}`)}
            className="w-full sm:w-auto"
          >
            回答を続ける
          </Button>
        </div>
      </div>

      {/* Collapsible answer log */}
      {questions.length > 0 && (
        <AnswerLog questions={questions} getAnswerLabel={getAnswerLabel} />
      )}

      {/* AI Report section */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-sm">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-foreground">AIレポート</h2>
          </div>
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown
              components={{
                p: ({ node, children, ...props }) => (
                  <p {...props}>{renderWithCitations(children)}</p>
                ),
                li: ({ node, children, ...props }) => (
                  <li {...props}>{renderWithCitations(children)}</li>
                ),
                blockquote: ({ node, children, ...props }) => (
                  <blockquote {...props}>{renderWithCitations(children)}</blockquote>
                ),
                h1: ({ node, children, ...props }) => (
                  <h1 {...props}>{renderWithCitations(children)}</h1>
                ),
                h2: ({ node, children, ...props }) => (
                  <h2 {...props}>{renderWithCitations(children)}</h2>
                ),
                h3: ({ node, children, ...props }) => (
                  <h3 {...props}>{renderWithCitations(children)}</h3>
                ),
                h4: ({ node, children, ...props }) => (
                  <h4 {...props}>{renderWithCitations(children)}</h4>
                ),
                h5: ({ node, children, ...props }) => (
                  <h5 {...props}>{renderWithCitations(children)}</h5>
                ),
                h6: ({ node, children, ...props }) => (
                  <h6 {...props}>{renderWithCitations(children)}</h6>
                ),
              }}
            >
              {normalizedReportText}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnswerLog({
  questions,
  getAnswerLabel,
}: {
  questions: QuestionData[];
  getAnswerLabel: (q: QuestionData) => string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const answeredQuestions = questions.filter((q) => q.selectedOption !== null);

  return (
    <div className="mb-8 border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted hover:bg-muted transition-colors"
      >
        <span className="text-sm font-medium text-foreground/80">
          回答ログ（{answeredQuestions.length}問）
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="divide-y divide-border">
          {answeredQuestions.map((q) => (
            <div key={q.question_index} className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">
                Q{q.question_index}
              </p>
              <p className="text-sm text-foreground/80">{q.statement}</p>
              <p className="text-sm font-medium text-foreground mt-1">
                → {getAnswerLabel(q) ?? "未回答"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
