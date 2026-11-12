// Common types for the application

export interface User {
  id: string | number;
  uuid?: string;
  email: string;
  full_name?: string;
  firstname?: string | null;
  lastname?: string | null;
  phone?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  student_id?: string;
  university?: {
    id: number;
    name: string;
    code?: string;
  };
  faculty?: {
    id: number;
    name: string;
    code?: string;
  };
  department?: {
    id: number;
    name: string;
    code?: string;
  };
  organization?: {
    id: number;
    name: string;
    code?: string;
  } | null;
  level?: string;
  xp_total?: number;
  streak_days?: number;
  current_streak?: number;
  last_activity_date?: string;
  status?: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  preferences?: Record<string, unknown>;
  social_links?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    portfolio?: string;
  };
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuthToken {
  token: string;
  token_type: string;
  expires_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  error_code?: string;
  timestamp?: string;
  request_id?: string;
}

/**
 * The raw Laravel paginator, returned directly as `data` by every paginated
 * endpoint (e.g. `GET /student/courses`, `GET /student/feed`) — flat fields,
 * no `success`/`meta`/`links` wrapper.
 */
export interface PaginatedResponse<T = unknown> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

/**
 * Pagination block of the `{ data: [...], meta }` endpoints (coins, roadmaps):
 * `meta` sits at the top level of the envelope, a sibling of `data`. Distinct
 * from `PaginatedResponse<T>` above, which is the raw Laravel paginator.
 */
export interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}
