"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReportPreviewProps {
  sessionId: string;
  reportText: string;
  version: number;
}

export function ReportPreview({
  sessionId,
  reportText,
  version,
}: ReportPreviewProps) {
  return (
    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 p-5 md:p-6">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-emerald-200">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 shadow-sm">
            <FileText className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-800">
              診断レポート
            </h3>
            <p className="text-xs text-emerald-600">バージョン {version}</p>
          </div>
        </div>

        <div className="relative max-h-56 overflow-hidden">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{reportText}</ReactMarkdown>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-emerald-50 to-transparent" />
        </div>

        <div className="mt-4">
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/report/${sessionId}`}>
              レポート全文を見る
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
