import api from "./api";
import type { ApiResponse } from "../types";
import type {
  GlobalSearchResult,
  CourseSearchResult,
  PostSearchResult,
  SearchSuggestions,
  PopularQueries,
  RecentQueries,
  SearchAnalytics,
} from "../types/search";

// Global search
export const globalSearch = async (
  query: string,
  filters?: {
    category?: "courses" | "posts" | "users" | "all";
    type?: string;
    tags?: string[];
    priority_min?: number;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<GlobalSearchResult> => {
  const params = new URLSearchParams();
  params.append("q", query);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.tags) {
    filters.tags.forEach((tag) => params.append("tags[]", tag));
  }
  if (filters?.priority_min)
    params.append("priority_min", filters.priority_min.toString());
  if (filters?.date_from) params.append("date_from", filters.date_from);
  if (filters?.date_to) params.append("date_to", filters.date_to);
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  const response = await api.get<ApiResponse<GlobalSearchResult>>(
    `/student/search?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Search failed");
  }

  return response.data.data;
};

// Search courses
export const searchCourses = async (
  query: string,
  filters?: {
    level?: string;
    status?: "published" | "draft";
    /** Round 12: only courses tagged with this official university module. */
    academic_module_id?: number;
    tags?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<CourseSearchResult> => {
  const params = new URLSearchParams();
  params.append("q", query);
  if (filters?.level) params.append("level", filters.level);
  if (filters?.academic_module_id)
    params.append("academic_module_id", filters.academic_module_id.toString());
  if (filters?.status) params.append("status", filters.status);
  if (filters?.tags) {
    filters.tags.forEach((tag) => params.append("tags[]", tag));
  }
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  const response = await api.get<ApiResponse<CourseSearchResult>>(
    `/student/search/courses?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Course search failed");
  }

  return response.data.data;
};

// Search posts
export const searchPosts = async (
  query: string,
  filters?: {
    type?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<PostSearchResult> => {
  const params = new URLSearchParams();
  params.append("q", query);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.tags) {
    filters.tags.forEach((tag) => params.append("tags[]", tag));
  }
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  const response = await api.get<ApiResponse<PostSearchResult>>(
    `/student/search/posts?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Post search failed");
  }

  return response.data.data;
};

// Get search suggestions
export const getSearchSuggestions = async (
  query: string,
  category?: "courses" | "posts" | "users" | "all",
  limit?: number
): Promise<SearchSuggestions> => {
  const params = new URLSearchParams();
  params.append("q", query);
  if (category) params.append("category", category);
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<SearchSuggestions>>(
    `/student/search/suggestions?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch search suggestions"
    );
  }

  return response.data.data;
};

// Get popular search queries
export const getPopularQueries = async (
  days?: number,
  limit?: number
): Promise<PopularQueries> => {
  const params = new URLSearchParams();
  if (days) params.append("days", days.toString());
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<PopularQueries>>(
    `/student/search/popular?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch popular queries"
    );
  }

  return response.data.data;
};

// Get recent search queries
export const getRecentQueries = async (
  limit?: number
): Promise<RecentQueries> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<{ queries: RecentQueries }>>(
    `/student/search/recent?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch recent queries"
    );
  }

  return response.data.data.queries;
};

// Get search analytics
export const getSearchAnalytics = async (): Promise<SearchAnalytics> => {
  const response = await api.get<ApiResponse<SearchAnalytics>>(
    "/student/search/analytics"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch search analytics"
    );
  }

  return response.data.data;
};

