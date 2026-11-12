import type { CourseRoadmapRef } from "./roadmap";
import type { AcademicModule } from "./academicModule";

export interface CourseFilters {
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  organization_id?: number;
  level?: string;
  search?: string;
  /** Round 12: only courses tagged with this official university module. */
  academic_module_id?: number;
  sort_by?: "created_at" | "title";
  sort_order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface Module {
  id: number;
  uuid?: string;
  title: string;
  description?: string;
  order_index: number;
  course_id?: number;
  is_published?: boolean;
  learning_objectives?: string[] | null;
  estimated_duration_minutes?: number | null;
  /** Present when lessons aren't eager-loaded (e.g. List Courses) */
  lessons_count?: number;
  lessons?: Lesson[];
  created_at?: string;
  updated_at?: string;
}

export interface LessonQuiz {
  id: number;
  uuid?: string;
  quiz_type?: string;
  question?: string;
  order_index?: number;
  xp_reward?: number;
}

export interface Lesson {
  id: number;
  uuid?: string;
  title: string;
  description: string;
  lesson_type?: string;
  order_index: number;
  is_published?: boolean;
  estimated_duration_minutes?: number | null;
  xp_reward?: number;
  /** Nested on Course Details/Course Progress; not a separate count field */
  quizzes?: LessonQuiz[];
  // Legacy/derived fields — not returned by the API directly.
  // `is_completed` in particular must be derived client-side from
  // course-progress's `lessons_completed` count (there is no per-lesson
  // completion flag in the Lesson resource).
  mini_lessons_count?: number;
  quizzes_count?: number;
  estimated_minutes?: number;
  is_completed?: boolean;
}

export interface Instructor {
  id: number;
  name: string;
  title: string;
  avatar_url?: string;
}

/** Paid-courses (Round 4): a Monime one-time payment record. */
export interface PaymentInfo {
  uuid: string;
  status: string;
  amount: number;
  currency: string;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

/** Where a student stands with a course — see GET .../enrollment-status (§16a). */
export type EnrollmentState =
  | "available"
  | "payment_pending"
  | "payment_processing"
  | "enrolled";

export interface EnrollmentStatus {
  state: EnrollmentState;
  is_enrolled: boolean;
  is_paid: boolean;
  price: number | null;
  currency: string;
  checkout_url: string | null;
  payment: PaymentInfo | null;
}

export interface CourseDetail {
  id: number;
  uuid: string;
  slug?: string;
  title: string;
  description: string;
  level: string;
  status?: string;
  semester?: string;
  thumbnail_url?: string;
  /** Paid-courses (Round 4): admin-approved price. `price` is in major units (150.0 = SLE 150.00), null when free. */
  is_paid?: boolean;
  price?: number | null;
  currency?: string;
  /** Vybe Coins (Round 5): paid once on first completion of a paid course. 0 for free courses / no reward set. */
  coin_reward?: number;
  /** Computed by the backend from local data only (no Monime call) — drives the enroll button. */
  enrollment_state?: EnrollmentState;
  /**
   * Roadmaps (Round 6), Course Details only: the published roadmaps this course
   * is part of and its place in each. `[]` for a standalone course. Informational:
   * a roadmap never gates the course.
   */
  roadmaps?: CourseRoadmapRef[];
  /** Round 12: the official university module this course is tagged with, or `null`. */
  academic_module?: AcademicModule | null;
  creator?: Instructor;
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
  meta?: {
    modules_count: number;
    lessons_count: number;
    estimated_hours: number;
    published_at: string;
  };
  modules?: Module[];
  instructor?: Instructor;
  enrollments_count?: number;
  is_enrolled?: boolean;
  progress?: {
    progress_percentage: number;
    completed_lessons: number;
    completed_quizzes: number;
    is_completed: boolean;
    last_activity_at?: string;
    enrolled_at?: string;
  };
  created_at?: string;
}

export interface CourseProgress {
  id: number;
  uuid?: string;
  // Removed from the curated GET .../progress response — use course.id/course.uuid.
  course_id?: number;
  student_id?: number;
  progress_percentage?: number;
  progress_percent?: number | string;
  /** Lesson-completion count (always present on GET .../progress) */
  lessons_completed?: number;
  /** Quiz-completion count (always present on GET .../progress) */
  quizzes_completed?: number;
  /**
   * Raw completed-lesson-id array — only present on the POST
   * .../progress response, NOT on GET .../progress (curated away).
   * Prefer `lessons_completed` (count) when this is absent.
   */
  completed_lessons?: number | number[];
  /**
   * Raw completed-quiz array — only present on the POST .../progress
   * response, NOT on GET .../progress (curated away).
   * Prefer `quizzes_completed`/`quizzes_passed` (count) when absent.
   */
  completed_quizzes?:
    | number
    | Array<{ quiz_id: number; completed_at: string }>;
  quizzes_passed?: number;
  streak_count?: number | null;
  xp_earned?: number;
  xp_available?: number;
  total_xp_available?: number;
  xp_awarded?: number;
  is_completed: boolean;
  last_activity_at?: string;
  last_accessed_at?: string | null;
  last_accessed_date?: string | null;
  completed_at?: string | null;
  enrolled_at?: string;
  created_at?: string;
  updated_at?: string;
  last_lesson_id?: number | null;
  last_module_id?: number | null;
  course?: {
    id: number;
    title: string;
    modules?: Module[];
  };
}
