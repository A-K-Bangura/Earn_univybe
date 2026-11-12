import api from "./api";
import type { ApiResponse, PaginatedResponse } from "../types";
import type {
  LegacyDashboardStats,
  DashboardData,
  Course,
  Enrollment,
} from "../types/dashboard";

// Get dashboard data
export const getDashboard = async (): Promise<DashboardData> => {
  const response = await api.get<ApiResponse<DashboardData>>(
    "/student/dashboard"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch dashboard");
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

// Legacy function for backward compatibility
export const getDashboardStats = async (): Promise<LegacyDashboardStats> => {
  const dashboard = await getDashboard();
  return {
    xp_total: dashboard.student.total_xp,
    streak_days: dashboard.stats.current_streak,
    current_level: dashboard.student.score_level,
    xp_to_next_level: 0, // Will be calculated from XP
    courses_enrolled: dashboard.stats.enrolled_courses,
    courses_completed: dashboard.stats.completed_courses,
    lessons_completed: dashboard.stats.lessons_completed,
    badges_count: dashboard.stats.badges_earned,
  };
};
