import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AnalysisBlockProps {
  batchIndex: number;
  text: string;
}

export function AnalysisBlock({ batchIndex, text }: AnalysisBlockProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 p-5 md:p-6">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-200">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-sm">
            <Lightbulb className="w-4.5 h-4.5 text-white" />
          </div>
          <h3 className="text-base font-bold text-blue-800">
            分析 #{batchIndex}（Q{(batchIndex - 1) * 5 + 1}-Q{batchIndex * 5}）
          </h3>
        </div>
        <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}
