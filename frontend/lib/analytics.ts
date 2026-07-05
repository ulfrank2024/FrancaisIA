const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface TrackPayload {
  userId?: string;
  event: string;
  page: string;
  section?: string;
  metadata?: Record<string, unknown>;
}

// Fire-and-forget — n'interrompt jamais le flux utilisateur
export function trackEvent(payload: TrackPayload): void {
  if (typeof window === 'undefined') return;
  fetch(`${BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export const EVENTS = {
  PAGE_VIEW:         'page_view',
  SESSION_START:     'session_start',
  SESSION_COMPLETE:  'session_complete',
  PRICING_VIEW:      'pricing_view',
  FORMATION_VIEW:    'formation_view',
  REGISTER_CLICK:    'register_click',
  LOGIN_SUCCESS:     'login_success',
  SURVEY_SHOWN:      'survey_shown',
  SURVEY_SUBMITTED:  'survey_submitted',
} as const;
