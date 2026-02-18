/**
 * UnifiedAppHeader - Plural Reality 統一アプリヘッダー
 * 正規ソース: sonar/src/components/shared/UnifiedAppHeader.tsx
 * コピー先: flux/src/components/shared/, cartographer/app/components/shared/
 * 同期方法: 手動コピー（将来的には npm パッケージ化検討）
 */
"use client";

import { useState, useRef, useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface AppHeaderProps {
  service: "baisoku-survey" | "baisoku-kaigi" | "flux";
  userEmail?: string | null;
  lang?: "ja" | "en";
  onLanguageChange?: (lang: "ja" | "en") => void;
  onSignOut?: () => void;
  appNavItems?: NavItem[];
  rightSlot?: React.ReactNode;
}

const SERVICE_LABELS: Record<AppHeaderProps["service"], { ja: string; en: string }> = {
  "baisoku-survey": { ja: "倍速アンケート", en: "Baisoku Survey" },
  "baisoku-kaigi": { ja: "倍速会議", en: "Baisoku Kaigi" },
  flux: { ja: "Flux", en: "Flux" },
};

const SERVICE_LINKS: Array<{
  key: AppHeaderProps["service"];
  href: string;
  label: { ja: string; en: string };
}> = [
  {
    key: "baisoku-survey",
    href: "https://baisoku-survey.plural-reality.com",
    label: { ja: "倍速アンケート", en: "Baisoku Survey" },
  },
  {
    key: "baisoku-kaigi",
    href: "https://app.baisoku-kaigi.plural-reality.com",
    label: { ja: "倍速会議", en: "Baisoku Kaigi" },
  },
  {
    key: "flux",
    href: "https://flux.plural-reality.com",
    label: { ja: "Flux", en: "Flux" },
  },
];

export function UnifiedAppHeader({
  service,
  userEmail,
  lang = "ja",
  onLanguageChange,
  onSignOut,
  appNavItems,
  rightSlot,
}: AppHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const t = (obj: { ja: string; en: string }) => obj[lang];
  const serviceLabel = t(SERVICE_LABELS[service]);

  return (
    <header
      className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      role="banner"
    >
      <div className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Service Name + Nav */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? (lang === "ja" ? "メニューを閉じる" : "Close menu") : (lang === "ja" ? "メニューを開く" : "Open menu")}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* PR Logo */}
          <a
            href="https://plural-reality.com"
            className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity duration-200"
            aria-label="Plural Reality"
          >
            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              PR
            </span>
          </a>

          <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden="true">/</span>

          {/* Service Name */}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {serviceLabel}
          </span>

          {/* Desktop Nav Items */}
          {appNavItems && appNavItems.length > 0 && (
            <nav className="hidden sm:flex items-center gap-1 ml-4" role="navigation" aria-label={lang === "ja" ? "アプリナビゲーション" : "App navigation"}>
              {appNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${
                    item.active
                      ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 font-medium"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </div>

        {/* Right: rightSlot + Language + User Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}

          {/* Language Toggle */}
          {onLanguageChange && (
            <button
              onClick={() => onLanguageChange(lang === "ja" ? "en" : "ja")}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-200"
              aria-label={lang === "ja" ? "Switch to English" : "日本語に切り替え"}
              title={lang === "ja" ? "English" : "日本語"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
            </button>
          )}

          {/* User Menu */}
          {userEmail ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-200"
                aria-label={lang === "ja" ? "ユーザーメニュー" : "User menu"}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
                  {/* Email */}
                  <div className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 truncate">
                    {userEmail}
                  </div>

                  {/* Other Services */}
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
                      {lang === "ja" ? "他のサービス" : "Other Services"}
                    </div>
                    {SERVICE_LINKS.filter((s) => s.key !== service).map((s) => (
                      <a
                        key={s.key}
                        href={s.href}
                        className="block px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors duration-200"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(s.label)}
                      </a>
                    ))}
                  </div>

                  {/* Settings (future) */}
                  <button
                    disabled
                    className="w-full text-left px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  >
                    {lang === "ja" ? "設定" : "Settings"}
                  </button>

                  {/* Sign Out */}
                  {onSignOut && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                    >
                      {lang === "ja" ? "ログアウト" : "Sign Out"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <a
              href="/login"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
            >
              {lang === "ja" ? "ログイン" : "Sign In"}
            </a>
          )}
        </div>
      </div>

      {/* Mobile Slide-down Panel */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {appNavItems && appNavItems.length > 0 && (
            <nav className="px-4 py-2 space-y-1" role="navigation" aria-label={lang === "ja" ? "モバイルナビゲーション" : "Mobile navigation"}>
              {appNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 text-sm rounded-md transition-colors duration-200 ${
                    item.active
                      ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          {/* Mobile service links */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1 px-3">
              {lang === "ja" ? "他のサービス" : "Other Services"}
            </div>
            {SERVICE_LINKS.filter((s) => s.key !== service).map((s) => (
              <a
                key={s.key}
                href={s.href}
                className="block px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(s.label)}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
