import api from "./api";
import type { ApiResponse, PaginatedResponse } from "../types";
import type { Course, Enrollment } from "../types/dashboard";
import type {
  CourseDetail,
  CourseFilters,
  CourseProgress,
  EnrollmentStatus,
  PaymentInfo,
} from "../types/course";
import type { CoinsAwarded } from "../types/coins";
import type { RoadmapCompletedEvent } from "../types/roadmap";
import { isOnline, isNetworkError, queueOfflineAction } from "../utils/db";

// Get all courses with filters
export const getCourses = async (
  filters: CourseFilters = {}
): Promise<PaginatedResponse<Course>> => {
  const params = new URLSearchParams();
  if (filters.university_id)
    params.append("university_id", filters.university_id.toString());
  if (filters.faculty_id)
    params.append("faculty_id", filters.faculty_id.toString());
  if (filters.department_id)
    params.append("department_id", filters.department_id.toString());
  if (filters.organization_id)
    params.append("organization_id", filters.organization_id.toString());
  if (filters.level) params.append("level", filters.level);
  if (filters.search) params.append("search", filters.search);
  if (filters.academic_module_id)
    params.append("academic_module_id", filters.academic_module_id.toString());
  if (filters.sort_by) params.append("sort_by", filters.sort_by);
  if (filters.sort_order) params.append("sort_order", filters.sort_order);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.per_page) params.append("per_page", filters.per_page.toString());

  const response = await api.get<ApiResponse<PaginatedResponse<Course>>>(
    `/student/courses?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch courses");
  }

  return response.data.data;
};

// Get enrolled courses - returns enrollment objects with nested course
export const getEnrolledCourses = async (): Promise<Enrollment[]> => {
  const response = await api.get<ApiResponse<PaginatedResponse<Enrollment>>>(
    "/student/courses/enrolled"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch enrolled courses"
    );
  }

  // Convert progress_percent from string to number if needed
  const enrollments = (response.data.data.data || []).map((enrollment) => ({
    ...enrollment,
    progress_percent:
      typeof enrollment.progress_percent === "string"
        ? parseFloat(enrollment.progress_percent)
        : enrollment.progress_percent,
  }));

  return enrollments;
};

// Get course details by UUID/ID
export const getCourseDetail = async (
  courseId: string | number
): Promise<CourseDetail> => {
  const response = await api.get<
    ApiResponse<{
      course: CourseDetail;
      is_enrolled?: boolean;
      progress?: {
        progress_percentage: number;
        completed_lessons: number;
        completed_quizzes: number;
        is_completed?: boolean;
        last_activity_at?: string;
        enrolled_at?: string;
      };
    }>
  >(`/student/courses/${courseId}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Course not found");
  }

  const { course, is_enrolled, progress } = response.data.data;

  const mergedProgress =
    progress !== undefined
      ? {
          progress_percentage:
            progress.progress_percentage ??
            course.progress?.progress_percentage ??
            0,
          completed_lessons:
            progress.completed_lessons ?? course.progress?.completed_lessons ?? 0,
          completed_quizzes:
            progress.completed_quizzes ?? course.progress?.completed_quizzes ?? 0,
          is_completed:
            progress.is_completed ?? course.progress?.is_completed ?? false,
          last_activity_at:
            progress.last_activity_at ?? course.progress?.last_activity_at,
          enrolled_at: progress.enrolled_at ?? course.progress?.enrolled_at,
        }
      : course.progress;

  // Merge is_enrolled and progress into the course object
  return {
    ...course,
    is_enrolled: is_enrolled ?? course.is_enrolled,
    progress: mergedProgress,
  };
};

// Get course progress
export const getCourseProgress = async (
  courseId: string | number
): Promise<CourseProgress> => {
  const response = await api.get<ApiResponse<{ progress: CourseProgress }>>(
    `/student/courses/${courseId}/progress`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch course progress");
  }

  return response.data.data.progress;
};

// Enroll in a course. Free courses (and paid courses whose payment already
// cleared) enroll immediately; paid courses instead return a Monime
// `checkout_url` to redirect the browser to — see docs/STUDENT_API_PAYLOADS.md
// §16. Callers must branch on `requires_payment` before assuming `progress`.
export type EnrollResult =
  | {
      requires_payment: true;
      enrollment_state: string;
      checkout_url: string | null;
      payment: PaymentInfo;
    }
  | {
      requires_payment?: false;
      progress: CourseProgress;
      xp_awarded: number;
    };

export const enrollInCourse = async (
  courseId: string | number
): Promise<EnrollResult> => {
  const response = await api.post<ApiResponse<EnrollResult>>(
    `/student/courses/${courseId}/enroll`,
    {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to enroll in course");
  }

  return response.data.data;
};

// Where a student stands with a course — poll this while showing
// "Confirming Payment…" after returning from Monime checkout (§16a). Unlike
// CourseDetail's `enrollment_state`, this also re-checks with Monime, so a
// delayed/lost webhook can't strand a student on payment_processing forever.
export const getEnrollmentStatus = async (
  courseId: string | number
): Promise<EnrollmentStatus> => {
  const response = await api.get<ApiResponse<EnrollmentStatus>>(
    `/student/courses/${courseId}/enrollment-status`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch enrollment status"
    );
  }

  return response.data.data;
};

// Unenroll from a course
export const unenrollFromCourse = async (
  courseId: string | number
): Promise<void> => {
  const response = await api.post<ApiResponse<void>>(
    `/student/courses/${courseId}/unenroll`,
    {}
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to unenroll from course");
  }
};

// Update course progress (marks a lesson or quiz complete).
// This is the single endpoint both quiz submission and lesson completion go
// through in the UI (Quiz.tsx / CoursePlayer.tsx) — see docs/DECISIONS.md.
// Offline-aware: if the request can't reach the server, the action is queued
// locally (via services/sync.ts, drained on reconnect) and this throws
// OfflineQueuedError instead of the real result — callers should catch that
// specifically to show a "saved, will sync later" state.
export const updateCourseProgress = async (
  courseId: string | number,
  data: { lesson_id?: number; quiz_id?: number; completed: boolean }
): Promise<{
  progress: CourseProgress;
  course_completed: boolean;
  /** Only present when this request completes a paid course with a coin reward — see docs/STUDENT_API_PAYLOADS.md §17. */
  coins_awarded?: CoinsAwarded;
  /** Only present when this request just finished a roadmap (one course can finish several); see docs/STUDENT_API_PAYLOADS.md "Finishing a roadmap". */
  roadmaps_completed?: RoadmapCompletedEvent[];
}> => {
  const url = `/student/courses/${courseId}/progress`;
  const actionType = data.lesson_id !== undefined ? "lesson_complete" : "quiz_complete";

  if (!isOnline()) {
    return queueOfflineAction({ type: actionType, method: "POST", url, payload: data });
  }

  try {
    const response = await api.post<
      ApiResponse<{
        progress: CourseProgress;
        course_completed: boolean;
        coins_awarded?: CoinsAwarded;
        roadmaps_completed?: RoadmapCompletedEvent[];
      }>
    >(url, data);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to update progress");
    }

    return response.data.data;
  } catch (error) {
    if (isNetworkError(error)) {
      return queueOfflineAction({ type: actionType, method: "POST", url, payload: data });
    }
    throw error;
  }
};

// Get course modules
export const getCourseModules = async (
  courseId: string | number
): Promise<
  Array<{ id: number; uuid: string; title: string; order_index: number }>
> => {
  const response = await api.get<
    ApiResponse<{
      modules: Array<{
        id: number;
        uuid: string;
        title: string;
        order_index: number;
      }>;
    }>
  >(`/student/courses/${courseId}/modules`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch modules");
  }

  return response.data.data.modules;
};

// Get recommended courses
export const getRecommendedCourses = async (filters?: {
  department_id?: number;
  faculty_id?: number;
  university_id?: number;
  level?: string;
}): Promise<Course[]> => {
  const params = new URLSearchParams();
  params.append("recommended", "true");

  if (filters?.department_id) {
    params.append("department_id", filters.department_id.toString());
  }
  if (filters?.faculty_id) {
    params.append("faculty_id", filters.faculty_id.toString());
  }
  if (filters?.university_id) {
    params.append("university_id", filters.university_id.toString());
  }
  if (filters?.level) {
    params.append("level", filters.level);
  }

  const response = await api.get<ApiResponse<Course[]>>(
    `/student/courses?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch recommended courses"
    );
  }

  return response.data.data || [];
};
