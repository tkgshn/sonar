export function trackEvent(eventName: string, data?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && (window as any).umami) {
    (window as any).umami.track(eventName, data);
  }
}

export const ANALYTICS_EVENTS = {
  SESSION_CREATED: 'session_created',
  REPORT_GENERATED: 'report_generated',
  AUTH_LOGIN: 'auth_login',
  CTA_CLICKED: 'cta_clicked',
  EXPORT_COMPLETED: 'export_completed',
} as const;
