import type { CoinBalance } from "./coins";
import type { GigReputation } from "./gig";

export interface UserProfile {
  id: string | number;
  uuid?: string;
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  student_id?: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  university?: {
    id: number;
    name: string;
    code?: string;
    logo_url?: string;
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
  year_of_study?: string;
  /** XP-tier gamification level (distinct from the academic `level`/`year_of_study`) */
  score_level?: number;
  gpa?: number | null;
  status?: string;
  verified_at?: string | null;
  profile_completion?: number;
  preferences?: Record<string, unknown>;
  social_links?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    portfolio?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  } | null;
  xp_total?: number;
  streak_days?: number;
  current_streak?: number;
  longest_streak?: number;
  /** Vybe Coins (Round 5) — a second reward currency, separate from XP. */
  coins?: CoinBalance;
  /** Gigs (Round 9) — additive; ratings received as a worker and/or as a gig creator. */
  gig_reputation?: GigReputation;
  last_activity_date?: string | null;
  badges_count?: number;
  courses_enrolled?: number;
  courses_completed?: number;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  // Legacy fields for backward compatibility
  name?: string;
  study_level?: string;
  stats?: {
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    lessons_completed: number;
    quizzes_completed: number;
    courses_enrolled: number;
    courses_completed: number;
    study_time_hours: number;
    level: number;
  };
  badges?: Badge[];
  achievements?: Achievement[];
  recent_activity?: RecentActivity[];
}

export interface UpdateProfileData {
  firstname?: string;
  lastname?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  bio?: string;
  interests?: string[];
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  student_id?: string;
  year_of_study?: number;
  preferences?: Record<string, unknown>;
  social_links?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    portfolio?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  earned_at: string;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon_url: string;
  unlocked_at: string;
}

export interface RecentActivity {
  id: number;
  type: "lesson" | "quiz" | "course";
  title: string;
  xp_earned: number;
  completed_at: string;
}
