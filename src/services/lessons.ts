import api from "./api";
import { AxiosError } from "axios";
import type { ApiResponse } from "../types";
import type {
  LessonDetail,
  ModuleDetail,
  LessonList,
  MiniLessonList,
  MiniLessonDetail,
} from "../types/lesson";

// Custom error for sequential access
export class SequentialAccessError extends Error {
  code: string;
  details?: {
    message?: string;
    lesson_order?: number;
    module_id?: number;
    module_order?: number;
  };

  constructor(
    message: string,
    code: string = "SEQUENTIAL_ACCESS_REQUIRED",
    details?: {
      message?: string;
      lesson_order?: number;
      module_id?: number;
      module_order?: number;
    }
  ) {
    super(message);
    this.name = "SequentialAccessError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, SequentialAccessError.prototype);
  }
}

// Get lesson details
export const getLessonDetail = async (
  lessonId: string | number
): Promise<LessonDetail> => {
  try {
    const response = await api.get<ApiResponse<{ lesson: LessonDetail }>>(
      `/student/lessons/${lessonId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Lesson not found");
    }

    return response.data.data.lesson;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const apiResponse = error.response.data as ApiResponse;
      if (
        apiResponse.error?.code === "SEQUENTIAL_ACCESS_REQUIRED" ||
        error.response.status === 403
      ) {
        throw new SequentialAccessError(
          apiResponse.error?.message ||
            "You must complete all previous lessons before accessing this lesson",
          apiResponse.error?.code || "SEQUENTIAL_ACCESS_REQUIRED",
          apiResponse.error?.details as {
            message?: string;
            lesson_order?: number;
            module_id?: number;
            module_order?: number;
          }
        );
      }
    }
    throw error;
  }
};

// Get module details
export const getModuleDetail = async (
  moduleId: string | number
): Promise<ModuleDetail> => {
  try {
    const response = await api.get<ApiResponse<{ module: ModuleDetail }>>(
      `/student/modules/${moduleId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Module not found");
    }

    return response.data.data.module;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const apiResponse = error.response.data as ApiResponse;
      if (
        apiResponse.error?.code === "SEQUENTIAL_ACCESS_REQUIRED" ||
        error.response.status === 403
      ) {
        throw new SequentialAccessError(
          apiResponse.error?.message ||
            "You must complete all lessons in previous modules before accessing this module",
          apiResponse.error?.code || "SEQUENTIAL_ACCESS_REQUIRED",
          apiResponse.error?.details as {
            message?: string;
            lesson_order?: number;
            module_id?: number;
            module_order?: number;
          }
        );
      }
    }
    throw error;
  }
};

// Get module lessons
export const getModuleLessons = async (
  moduleId: string | number
): Promise<LessonList> => {
  try {
    const response = await api.get<ApiResponse<{ lessons: LessonList }>>(
      `/student/modules/${moduleId}/lessons`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch lessons");
    }

    return response.data.data.lessons;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const apiResponse = error.response.data as ApiResponse;
      if (
        apiResponse.error?.code === "SEQUENTIAL_ACCESS_REQUIRED" ||
        error.response.status === 403
      ) {
        throw new SequentialAccessError(
          apiResponse.error?.message ||
            "You must complete all lessons in previous modules before accessing this module",
          apiResponse.error?.code || "SEQUENTIAL_ACCESS_REQUIRED",
          apiResponse.error?.details as {
            message?: string;
            lesson_order?: number;
            module_id?: number;
            module_order?: number;
          }
        );
      }
    }
    throw error;
  }
};

// Get lesson mini-lessons
export const getLessonMiniLessons = async (
  lessonId: string | number
): Promise<MiniLessonList> => {
  const response = await api.get<ApiResponse<{ mini_lessons: MiniLessonList }>>(
    `/student/lessons/${lessonId}/mini-lessons`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch mini-lessons");
  }

  return response.data.data.mini_lessons;
};

// Get mini-lesson details
export const getMiniLessonDetail = async (
  miniLessonId: string | number
): Promise<MiniLessonDetail> => {
  const response = await api.get<
    ApiResponse<{ mini_lesson: MiniLessonDetail }>
  >(`/student/mini-lessons/${miniLessonId}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Mini-lesson not found");
  }

  return response.data.data.mini_lesson;
};
