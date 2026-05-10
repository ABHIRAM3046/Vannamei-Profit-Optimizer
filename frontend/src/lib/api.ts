/**
 * API client for communicating with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────

export const authAPI = {
  requestOTP: (phone: string) =>
    request<{ message: string; dev_otp: string | null }>("/api/auth/request-otp", {
      method: "POST",
      body: { phone },
    }),

  verifyOTP: (phone: string, otp: string) =>
    request<{ access_token: string; user: User }>("/api/auth/verify-otp", {
      method: "POST",
      body: { phone, otp },
    }),
};

// ─── Ponds ───────────────────────────────────────────

export const pondsAPI = {
  list: (ownerId: string) =>
    request<Pond[]>(`/api/ponds?owner_id=${ownerId}`),

  get: (pondId: string) =>
    request<Pond>(`/api/ponds/${pondId}`),

  create: (ownerId: string, data: PondCreateData) =>
    request<Pond>(`/api/ponds?owner_id=${ownerId}`, {
      method: "POST",
      body: data,
    }),

  update: (pondId: string, data: Partial<PondCreateData>) =>
    request<Pond>(`/api/ponds/${pondId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (pondId: string) =>
    request(`/api/ponds/${pondId}`, { method: "DELETE" }),

  transfer: (data: TransferRequest) =>
    request(`/api/ponds/transfer`, {
      method: "POST",
      body: data,
    }),
};

// ─── Market Prices ───────────────────────────────────

export const pricesAPI = {
  list: () =>
    request<MarketPrice[]>("/api/prices"),

  create: (data: Partial<MarketPrice>) =>
    request<MarketPrice>("/api/prices", {
      method: "POST",
      body: data,
    }),

  scrape: () =>
    request<MarketPrice[]>("/api/prices/scrape", {
      method: "POST",
    }),

  delete: (priceId: string) =>
    request(`/api/prices/${priceId}`, { method: "DELETE" }),
};

// ─── Daily Logs ──────────────────────────────────────

export const dailyLogsAPI = {
  list: (pondId: string) =>
    request<DailyLog[]>(`/api/ponds/${pondId}/daily-logs`),

  create: (pondId: string, data: DailyLogCreateData) =>
    request<DailyLog>(`/api/ponds/${pondId}/daily-logs`, {
      method: "POST",
      body: data,
    }),

  latest: (pondId: string) =>
    request<DailyLog>(`/api/ponds/${pondId}/daily-logs/latest`),
};

// ─── Analytics ───────────────────────────────────────

export const analyticsAPI = {
  get: (pondId: string) =>
    request<Analytics>(`/api/ponds/${pondId}/analytics`),
};

// ─── Feed ────────────────────────────────────────────

export const feedAPI = {
  recommendation: (pondId: string) =>
    request<FeedRecommendation>(`/api/ponds/${pondId}/feed-recommendation`),
};

// ─── Alerts ──────────────────────────────────────────

export const alertsAPI = {
  forPond: (pondId: string, unreadOnly = false) =>
    request<Alert[]>(`/api/ponds/${pondId}/alerts?unread_only=${unreadOnly}`),

  all: (ownerId: string, unreadOnly = false) =>
    request<Alert[]>(`/api/alerts?owner_id=${ownerId}&unread_only=${unreadOnly}`),

  markRead: (alertId: string) =>
    request(`/api/alerts/${alertId}/read`, { method: "PUT" }),
};

// ─── Harvest ─────────────────────────────────────────

export const harvestAPI = {
  plan: (pondId: string) =>
    request<HarvestPlan>(`/api/ponds/${pondId}/harvest-plan`),
};

// ─── Types ───────────────────────────────────────────

export interface MarketPrice {
  id: string;
  date_recorded: string;
  count_per_kg: number;
  price_per_kg: number;
  created_at: string;
}

export interface TransferRequest {
  source_pond_id: string;
  target_pond_id?: string;
  target_pond_name?: string;
  pl_count: number;
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  farm_name: string | null;
}

export interface PondMetrics {
  doc: number;
  biomass_kg: number | null;
  fcr: number | null;
  survival_rate: number | null;
  adg: number | null;
  avg_body_weight_g: number | null;
  total_feed_kg: number | null;
  surviving_count: number | null;
  cumulative_mortality: number | null;
}

export interface Pond {
  id: string;
  name: string;
  area_m2: number;
  stocking_date: string;
  pl_stocked: number;
  salinity_ppt: number | null;
  feed_type: string | null;
  feed_cost_per_kg: number;
  selling_price_per_kg: number;
  is_active: boolean;
  created_at: string;
  doc: number | null;
  latest_metrics: PondMetrics | null;
}

export interface PondCreateData {
  name: string;
  area_m2: number;
  stocking_date: string;
  pl_stocked: number;
  salinity_ppt?: number;
  feed_type?: string;
  feed_cost_per_kg: number;
  selling_price_per_kg: number;
}

export interface DailyLog {
  id: string;
  pond_id: string;
  log_date: string;
  doc: number;
  feed_given_kg: number;
  avg_body_weight_g: number | null;
  mortality_count: number;
  dissolved_oxygen: number | null;
  ph: number | null;
  ammonia: number | null;
  temperature_c: number | null;
  cumulative_feed_kg: number | null;
  cumulative_mortality: number | null;
  surviving_count: number | null;
  survival_rate: number | null;
  biomass_kg: number | null;
  fcr: number | null;
  adg: number | null;
  notes: string | null;
  created_at: string;
}

export interface DailyLogCreateData {
  log_date: string;
  feed_given_kg: number;
  avg_body_weight_g?: number;
  mortality_count: number;
  dissolved_oxygen?: number;
  ph?: number;
  ammonia?: number;
  temperature_c?: number;
  notes?: string;
}

export interface FeedRecommendation {
  recommended_feed_kg: number;
  current_feed_kg: number;
  change_percent: number;
  feeding_frequency: number;
  reasons: string[];
  fcr_status: string;
}

export interface Alert {
  id: string;
  pond_id: string;
  pond_name: string | null;
  alert_date: string;
  severity: "info" | "warning" | "critical";
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface TrendData {
  dates: string[];
  biomass: (number | null)[];
  fcr: (number | null)[];
  survival: (number | null)[];
  adg: (number | null)[];
  feed_daily: (number | null)[];
  abw: (number | null)[];
}

export interface Analytics {
  pond_id: string;
  pond_name: string;
  doc: number;
  current_metrics: PondMetrics;
  trends: TrendData;
  feed_recommendation: FeedRecommendation;
  active_alerts: Alert[];
}

export interface HarvestScenario {
  days_from_now: number;
  projected_abw_g: number;
  projected_biomass_kg: number;
  projected_survival: number;
  total_feed_cost: number;
  total_revenue: number;
  total_profit: number;
  profit_per_kg: number;
  projected_fcr: number;
}

export interface HarvestPlan {
  pond_id: string;
  pond_name: string;
  current_doc: number;
  scenarios: HarvestScenario[];
  optimal_harvest_day: number;
  optimal_profit: number;
  harvest_now_profit: number;
  recommendation: string;
}
