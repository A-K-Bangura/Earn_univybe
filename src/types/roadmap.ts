// Roadmaps (Round 6) — admin-curated, ordered learning journeys over existing
// courses. A roadmap *recommends* a sequence; it never gates one, and there is
// no "join roadmap" action. See docs/STUDENT_API_PAYLOADS.md §70-72 and
// docs/STUDENT_FRONTEND_API_CHANGES.md Round 6.

import type { PageMeta } from "./index";
import type { Course } from "./dashboard";

export type RoadmapCourseStatus = "not_enrolled" | "in_progress" | "completed";

export interface RoadmapNamedRef {
  id: number;
  name: string;
}

/** Computed over the WHOLE roadmap, never just the page that was loaded. */
export interface RoadmapProgress {
  completed_courses: number;
  total_courses: number;
  /** 0-100, rounded to 2 dp (33.33). */
  percent: number;
}

/** The trimmed course object used inside `current_course` and the list. */
export interface RoadmapCourseRef {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  thumbnail_url: string | null;
  is_paid: boolean;
  price: number | null;
}

/**
 * The first course, in the whole sequence, the student has not completed.
 * `null` for guests, for students who have not taken any course of the
 * roadmap, and for students who finished it.
 */
export interface RoadmapCurrentCourse {
  /** 1-based place in the whole roadmap. */
  position: number;
  /** Page this course is on, at the page size of the request. */
  page: number;
  course: RoadmapCourseRef;
}

/** The roadmap's completion badge. `earned` is permanent once true. */
export interface RoadmapBadge {
  id: number;
  uuid: string;
  name: string;
  description: string;
  icon_url: string | null;
  rarity: string;
  earned: boolean;
  earned_at: string | null;
}

export interface Roadmap {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  /** Academic year the roadmap is aimed at; `null` = general / open. */
  level: string | null;
  semester: string | null;
  university: RoadmapNamedRef | null;
  faculty: RoadmapNamedRef | null;
  department: RoadmapNamedRef | null;
  organization: RoadmapNamedRef | null;
  /** Only courses a student can take (published, not deleted). */
  total_courses: number;
  /** Turns true on its own once the student takes ANY course in the roadmap. */
  is_participant: boolean;
  /** Live: goes back to false if an admin later adds a course. */
  is_completed: boolean;
  /** `null` for guests. */
  progress: RoadmapProgress | null;
  current_course: RoadmapCurrentCourse | null;
  badge: RoadmapBadge | null;
  /**
   * Signed-in students only: higher = closer to their profile. Internal —
   * drives "Recommended for you"; never shown to students directly.
   */
  relevance_score?: number;
}

/** One course in a page of a roadmap, in the roadmap's exact order. */
export interface RoadmapCourseItem {
  /** Absolute place in the whole roadmap, not page-relative. */
  position: number;
  /** True for the student's current course when it is on this page. */
  is_current: boolean;
  status: RoadmapCourseStatus;
  is_enrolled: boolean;
  /** The course's own progress (0-100). */
  progress_percent: number;
  completed_at: string | null;
  /** Same object as `GET /student/courses`. */
  course: Course;
}

export type RoadmapSort = "relevance" | "newest" | "title";

export interface RoadmapFilters {
  search?: string;
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  organization_id?: number;
  level?: string;
  semester?: string;
  /** "My roadmaps". Needs a Student token — a guest gets 401. */
  participating?: boolean;
  sort?: RoadmapSort;
  page?: number;
  per_page?: number;
}

export interface RoadmapList {
  data: Roadmap[];
  meta: PageMeta;
}

export interface RoadmapDetail {
  roadmap: Roadmap;
  /** One page of the roadmap's courses. */
  courses: RoadmapCourseItem[];
  /** Describes that page of COURSES (`total` = every takeable course). */
  meta: PageMeta;
}

export interface RoadmapCoursesPage {
  data: RoadmapCourseItem[];
  meta: PageMeta;
}

export interface RoadmapPageParams {
  /** A positive integer, or `"current"` for the page holding the student's current course. */
  page?: number | "current";
  per_page?: number;
}

/** `data.course.roadmaps[]` on Course Details: where this course sits in each roadmap. */
export interface CourseRoadmapRef {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  thumbnail_url: string | null;
  position: number;
  total_courses: number;
}

/** `data.roadmaps_completed[]` on POST .../progress, only when that request just finished a roadmap. */
export interface RoadmapCompletedEvent {
  id: number;
  uuid: string;
  title: string;
  badge: { id: number; name: string; earned_at: string };
}

/** The roadmap an earned roadmap-completion badge/achievement belongs to. */
export interface RoadmapLink {
  id: number;
  uuid: string;
  slug: string;
  title: string;
}
