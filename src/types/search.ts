import type { AcademicModule } from "./academicModule";

// Search Result - Course
export interface CourseSearchItem {
  id: number;
  uuid?: string;
  title: string;
  description: string;
  level: string;
  status?: string;
  creator?: {
    id: number;
    name: string;
  };
  tags?: string[];
  enrollments_count?: number;
  thumbnail_url?: string;
  /** Round 12: the official university module this course is tagged with, or `null`. */
  academic_module?: AcademicModule | null;
}

// Search Result - Post
export interface PostSearchItem {
  id: number;
  title: string;
  content_text?: string;
  type: string;
  tags?: string[];
  author?: {
    id: number;
    name: string;
  };
  likes_count: number;
  comments_count: number;
}

// Search Result - User
export interface UserSearchItem {
  id: number;
  name: string;
  avatar_url?: string;
  university?: string;
}

// Global Search Results
export interface GlobalSearchResult {
  query: string;
  results: {
    courses: CourseSearchItem[];
    posts: PostSearchItem[];
    users: UserSearchItem[];
  };
  total_results: number;
  categories: {
    courses: number;
    posts: number;
    users: number;
  };
}

// Course Search Result
export interface CourseSearchResult {
  query: string;
  results: CourseSearchItem[];
  total: number;
}

// Post Search Result
export interface PostSearchResult {
  query: string;
  results: PostSearchItem[];
  total: number;
}

// Search Suggestions
export interface SearchSuggestions {
  suggestions: string[];
  query: string;
}

// Popular Query
export interface PopularQuery {
  query: string;
  count: number;
  category: string;
}

// Popular Queries
export interface PopularQueries {
  queries: PopularQuery[];
  period_days: number;
}

// Recent Query
export interface RecentQuery {
  query: string;
  category: string;
  executed_at: string;
}

// Recent Queries
export type RecentQueries = RecentQuery[];

// Search Analytics
export interface SearchAnalytics {
  total_searches: number;
  searches_by_category: {
    courses: number;
    posts: number;
    users: number;
  };
  most_searched_topics: Array<{
    query: string;
    count: number;
  }>;
  average_searches_per_day: number;
  search_success_rate: number;
}
