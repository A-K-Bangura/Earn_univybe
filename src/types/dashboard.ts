import type { CoinBalance } from "./coins";
import type { BadgeProgressObject } from "./gamification";
import type { RoadmapLink } from "./roadmap";
import type { AcademicModule } from "./academicModule";

// Legacy types for backward compatibility
export interface LegacyDashboardStats {
  xp_total: number;
  streak_days: number;
  current_level: number;
  xp_to_next_level: number;
  courses_enrolled: number;
  courses_completed: number;
  lessons_completed: number;
  badges_count: number;
}

// New dashboard types matching API response
export interface StudentInfo {
  id: string;
  name: string;
  avatar_url?: string;
  /** Raw academic level string (e.g. "300", "UnderGrad", "graduate") */
  level: string;
  /** XP-tier gamification level, e.g. 3 */
  score_level: number;
  total_xp: number;
  profile_completion: number;
  /** Vybe Coins (Round 5) — a second reward currency, separate from XP. */
  coins?: CoinBalance;
}

export interface DashboardStats {
  enrolled_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  lessons_completed: number;
  quizzes_passed: number;
  badges_earned: number;
  current_streak: number;
}

export interface RecentActivity {
  id: number;
  action_type: string;
  xp_change: number;
  reason: string;
  created_at: string;
  course?: {
    id: number;
    title: string;
  } | null;
}

export interface DashboardEnrolledCourse {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  progress_percentage: string | number;
  status: "in_progress" | "completed" | "not_started";
  enrolled_at: string;
  last_accessed_at?: string;
}

export interface ProgressSummary {
  courses: {
    total: number;
    completed: number;
    percentage: number;
  };
  lessons: {
    total: number;
    completed: number;
    percentage: number;
  };
  quizzes: {
    total: number;
    passed: number;
    percentage: number;
  };
}

/** A single awarded badge (e.g. from lesson-completion's `new_badge`) */
export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  earned_at?: string;
}

/** An entry from the badge catalog (earned + unearned), as returned by Get Dashboard/Get Gamification Dashboard/Get Badges */
export interface BadgeCatalogEntry {
  badge: {
    id: number;
    name: string;
    description?: string;
    icon_url: string | null;
    category?: string;
    rarity: string;
  };
  has_badge: boolean;
  /** A number for ordinary badges; earned roadmap badges send an object (see types/gamification.ts). */
  progress: number | BadgeProgressObject;
  awarded_at: string | null;
  /** Present only on earned roadmap-completion badges. */
  roadmap?: RoadmapLink;
}

export interface LeaderboardPosition {
  position: number;
  total_students: number;
  percentile: number;
}

export interface StreakHistoryItem {
  date: string;
  active: boolean;
}

export interface StreakStats {
  current_streak: number;
  longest_streak: number;
  active_days: number;
  average_activity: number;
  streak_history: StreakHistoryItem[];
}

export interface XPStats {
  total_xp: number;
  xp_by_action: Record<string, string | number>;
  recent_xp: string | number;
}

export interface DashboardData {
  student: StudentInfo;
  stats: DashboardStats;
  recent_activity: RecentActivity[];
  enrolled_courses: DashboardEnrolledCourse[];
  progress_summary: ProgressSummary;
  /** Entire badge catalog (earned + unearned) — filter on `has_badge === true` for earned only. */
  badges: BadgeCatalogEntry[];
  streak_stats: StreakStats;
  xp_stats: XPStats;
  // `achievements` and `leaderboard_position` were removed from this response.
  // Use GET /student/gamification/achievements and GET /student/gamification/position instead.
}

// Creator/Instructor type — the curated subset the API exposes on `course.creator`
// (STUDENT_API_PAYLOADS §12/§14). The raw tutor model (email, phone, status, …)
// is no longer returned.
export interface Creator {
  id: number;
  uuid: string;
  firstname: string;
  lastname: string;
  full_name?: string;
  avatar_url?: string | null;
}

// Module type (simplified for nested course)
export interface CourseModule {
  id: number;
  uuid: string;
  course_id: number;
  title: string;
  description?: string;
  order_index: number;
  is_published?: boolean;
  learning_objectives?: string[];
  estimated_duration_minutes?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// Course type matching the API response structure
export interface Course {
  id: number;
  uuid: string;
  title: string;
  description: string;
  short_description?: string;
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  level: string;
  semester?: string;
  course_code?: string;
  created_by?: number;
  estimated_duration_hours?: number;
  estimated_lessons_count?: number;
  estimated_quizzes_count?: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  /** `null` when the course has no thumbnail (the API sends null, not an empty string). */
  thumbnail_url: string | null;
  tags?: string[];
  status?: string;
  approved_by?: number;
  approved_at?: string | null;
  published_at?: string | null;
  rejection_reason?: string | null;
  enrolled_students_count?: number;
  completed_students_count?: number;
  average_rating?: string;
  total_ratings_count?: number;
  total_xp_available?: number;
  slug?: string;
  /** Paid-courses (Round 4): admin-approved price. `price` is in major units (150.0 = SLE 150.00), null when free. */
  is_paid?: boolean;
  price?: number | null;
  currency?: string;
  /** Vybe Coins (Round 5): paid once on first completion of a paid course. 0 for free courses / no reward set. */
  coin_reward?: number;
  metadata?: {
    difficulty?: string;
    language?: string;
  };
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_published?: boolean;
  is_approved?: boolean;
  creator?: Creator;
  modules?: CourseModule[];
  // Legacy fields for backward compatibility
  university?: {
    id: number;
    name: string;
  };
  faculty?: {
    id: number;
    name: string;
  };
  department?: {
    id: number;
    name: string;
  };
  organization?: {
    id: number;
    name: string;
  } | null;
  meta?: {
    modules_count: number;
    lessons_count: number;
    estimated_hours: number;
    published_at: string;
  };
  is_enrolled?: boolean;
  progress?: {
    progress_percent: number;
    last_accessed_at?: string;
    next_lesson?: {
      id: number;
      title: string;
    };
  };
  /**
   * Round 12 (2026-10-27): the official university module this course is
   * tagged with, or `null` for most courses. Optional — absent from course
   * cards inside roadmaps and from the dashboard's enrolled-course list.
   */
  academic_module?: AcademicModule | null;
}

// Enrollment type matching the API response
export interface Enrollment {
  id: number;
  uuid: string;
  // Removed from the curated Enrolled Courses / Course Progress response — use course.id/course.uuid instead.
  student_id?: number;
  course_id?: number;
  progress_percent: string | number; // API returns as string, but we'll convert to number
  xp_earned: number;
  lessons_completed: number;
  quizzes_completed: number;
  quizzes_passed: number;
  last_lesson_id?: number | null;
  last_module_id?: number | null;
  streak_count: number | null;
  last_accessed_date?: string | null;
  last_accessed_at?: string | null;
  completed_at?: string | null;
  completed_lessons?: number[] | null;
  completed_quizzes?: number[] | null;
  /** Derived from completed_at */
  is_completed?: boolean;
  created_at: string;
  updated_at: string;
  course: Course; // Nested course object
}
