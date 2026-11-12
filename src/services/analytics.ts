import api from "./api";
import type { ApiResponse, PaginatedResponse } from "../types";
import type {
  AnalyticsDashboard,
  CourseAnalytics,
  ProgressAnalytics,
  EngagementAnalytics,
  InsightsData,
  ReportGeneration,
  ReportDownload,
  Report,
  ReportList,
} from "../types/analytics";

// Get analytics dashboard
export const getAnalyticsDashboard = async (
  period?: "week" | "month" | "quarter" | "year"
): Promise<AnalyticsDashboard> => {
  const params = new URLSearchParams();
  if (period) params.append("period", period);

  const response = await api.get<ApiResponse<AnalyticsDashboard>>(
    `/student/analytics/dashboard?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch analytics dashboard"
    );
  }

  return response.data.data;
};

// Get course analytics
export const getCourseAnalytics = async (
  courseUuid: string
): Promise<CourseAnalytics> => {
  const response = await api.get<ApiResponse<CourseAnalytics>>(
    `/student/analytics/course/${courseUuid}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch course analytics"
    );
  }

  return response.data.data;
};

// Get progress analytics
export const getProgressAnalytics = async (): Promise<ProgressAnalytics> => {
  const response = await api.get<ApiResponse<ProgressAnalytics>>(
    "/student/analytics/progress"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch progress analytics"
    );
  }

  return response.data.data;
};

// Get insights
export const getInsights = async (): Promise<InsightsData> => {
  const response = await api.get<ApiResponse<InsightsData>>(
    "/student/analytics/insights"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch insights");
  }

  return response.data.data;
};

// Get engagement analytics
export const getEngagementAnalytics =
  async (): Promise<EngagementAnalytics> => {
    const response = await api.get<ApiResponse<EngagementAnalytics>>(
      "/student/analytics/engagement"
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || "Failed to fetch engagement analytics"
      );
    }

    return response.data.data;
  };

// Generate performance report
export const generateReport = async (data: {
  report_type: "learning_progress" | "engagement_summary" | "performance_analysis";
  period_type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  course_id?: number;
  include_recommendations?: boolean;
}): Promise<{ report: ReportGeneration; download_url: string }> => {
  const response = await api.post<
    ApiResponse<{ report: ReportGeneration; download_url: string }>
  >("/student/analytics/reports", data);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to generate report");
  }

  return response.data.data;
};

// Get reports list — the raw paginator is returned directly as `data`, no `reports` wrapper
export const getReports = async (): Promise<ReportList> => {
  const response = await api.get<ApiResponse<PaginatedResponse<Report>>>(
    "/student/analytics/reports"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch reports");
  }

  return response.data.data.data || [];
};

// Download report — despite the name, this returns JSON metadata, not a file stream
export const downloadReport = async (
  reportUuid: string
): Promise<ReportDownload> => {
  const response = await api.get<ApiResponse<ReportDownload>>(
    `/student/analytics/reports/${reportUuid}/download`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to get report download URL");
  }

  return response.data.data;
};

