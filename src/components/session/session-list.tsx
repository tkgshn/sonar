"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface LocalSession {
  id: string;
  purpose: string;
  createdAt: string;
}

export function SessionList() {
  const [sessions, setSessions] = useState<LocalSession[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("sonar_sessions");
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        過去のセッション
      </h2>
      <div className="space-y-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/session/${session.id}`}
            className="block p-4 bg-card rounded-lg border hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <p className="text-foreground font-medium line-clamp-2">
              {session.purpose}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(session.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
