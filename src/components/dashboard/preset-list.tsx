import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface PresetItem {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  created_at: string;
  session_count: number;
}

export function PresetList({ presets }: { presets: PresetItem[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          最近のアンケート
        </h2>
      </div>

      {/* Grid layout — Google Forms style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {presets.map((preset) => (
          <Link
            key={preset.id}
            href={`/manage/${preset.slug}`}
            className="group block"
          >
            <Card className="overflow-hidden hover:border-blue-300 hover:shadow-md transition-all py-0 gap-0">
              {/* Color bar */}
              <div className="h-1.5 bg-blue-600" />

              <CardContent className="p-3">
                <h3 className="text-sm font-medium text-foreground truncate group-hover:text-blue-600 transition-colors">
                  {preset.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {preset.purpose}
                </p>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>
                    {new Date(preset.created_at).toLocaleDateString("ja-JP")}
                  </span>
                  <span>{preset.session_count}件の回答</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
