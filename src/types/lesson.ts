import type { Quiz } from "./quiz";

export type MiniLessonContentType =
  | "text"
  | "code"
  | "image"
  | "video"
  | "link";

export type MiniLessonBlockContentType =
  | "text"
  | "image"
  | "video"
  | "embed"
  | "document";

export type MiniLessonTextType =
  | "plain"
  | "remember"
  | "simply_put"
  | "important"
  | "formula"
  /** Round 11: a single http(s) URL, rendered as a clickable link. */
  | "link"
  /** Round 11: text meant to be copied into an AI tool, rendered in a copy-friendly box. */
  | "prompt";

export interface MiniLessonBlock {
  id: number;
  uuid?: string;
  mini_lesson_id: number;
  content_type: MiniLessonBlockContentType;
  text_type?: MiniLessonTextType | null;
  content?: string | null;
  media_url?: string | null;
  media_metadata?: Record<string, unknown> | null;
  order_index: number;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MiniLesson {
  id: number;
  uuid?: string;
  content_type?: MiniLessonContentType; // legacy support
  content?: string | null; // legacy support
  order_index: number;
  lesson_id: number;
  created_at?: string;
  updated_at?: string;
  title?: string;
  description?: string | null;
  is_published?: boolean;
  deleted_at?: string | null;
  blocks?: MiniLessonBlock[];
  media_url?: string | null;
  media_metadata?: Record<string, unknown> | null;
  text_type?: MiniLessonTextType | null; // legacy support
  content_html?: string | null; // legacy support
}

export type LessonList = Array<{
  id: number;
  uuid?: string;
  title: string;
  description?: string;
  lesson_type?: string;
  order_index: number;
  module_id: number;
  duration_minutes?: number;
  created_at?: string;
}>;

export type MiniLessonList = Array<{
  id: number;
  uuid?: string;
  content_type: MiniLessonContentType;
  content: string;
  order_index: number;
  lesson_id: number;
  created_at?: string;
  blocks?: MiniLessonBlock[];
}>;

export interface LessonDetail {
  id: number;
  uuid?: string;
  title: string;
  description?: string;
  lesson_type?: string;
  content?: string;
  duration_minutes?: number;
  order_index: number;
  module_id: number;
  module?: {
    id: number;
    title: string;
    course?: {
      id: number;
      title: string;
    };
  };
  mini_lessons?: MiniLesson[];
  quizzes?: Quiz[];
  created_at?: string;
  updated_at?: string;
}

export interface ModuleDetail {
  id: number;
  uuid?: string;
  title: string;
  description?: string;
  order_index: number;
  course_id: number;
  course?: {
    id: number;
    title: string;
    status?: string;
  };
  lessons?: Array<{
    id: number;
    title: string;
    description?: string;
    order_index: number;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface MiniLessonDetail {
  id: number;
  uuid?: string;
  content_type: MiniLessonContentType;
  content: string;
  order_index: number;
  lesson_id: number;
  lesson?: {
    id: number;
    title: string;
    module?: {
      id: number;
      title: string;
      course?: {
        id: number;
        title: string;
      };
    };
  };
  created_at?: string;
  updated_at?: string;
}

// Legacy types for backward compatibility
export interface LessonContent {
  id: number;
  module_id: number;
  title: string;
  mini_lessons: MiniLesson[];
}

export interface CourseOutline {
  modules: Array<{
    id: number;
    title: string;
    order_index: number;
    is_completed?: boolean;
    lessons: Array<{
      id: number;
      title: string;
      order_index: number;
      is_completed: boolean;
      is_locked?: boolean; // Indicates if lesson is locked due to sequential access
      quizzes?: Array<{
        id: number;
        title?: string;
        order_index: number;
        is_completed: boolean;
      }>;
    }>;
  }>;
}

export interface ProgressData {
  currentLessonId: number;
  completedLessons: number[];
  currentModuleProgress: number;
  overallProgress: number;
}
