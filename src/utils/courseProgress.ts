import type { Module } from "../types/course";

/**
 * Derive the set of completed lesson IDs for a course.
 *
 * The backend enforces strictly sequential lesson access (a lesson's
 * content endpoints 403 with SEQUENTIAL_ACCESS_REQUIRED unless all prior
 * lessons/modules are completed), so when only a completion *count* is
 * available (the current shape of GET .../courses/{course}/progress —
 * the raw `completed_lessons` ID array was curated away from that
 * endpoint), the first N lessons in course order are the completed ones.
 *
 * Prefers the raw ID array when present (e.g. from the POST
 * .../progress response, which still includes it) for exactness.
 */
export function deriveCompletedLessonIds(
  modules: Module[] | undefined,
  completedLessons: number | number[] | undefined,
  lessonsCompletedCount: number | undefined
): Set<number> {
  if (Array.isArray(completedLessons)) {
    return new Set(
      completedLessons.filter((id): id is number => typeof id === "number")
    );
  }

  const count =
    lessonsCompletedCount ??
    (typeof completedLessons === "number" ? completedLessons : 0);
  if (!count || count <= 0 || !modules?.length) {
    return new Set<number>();
  }

  const flatLessonIds = modules.flatMap((module) =>
    (module.lessons || []).map((lesson) => lesson.id)
  );
  return new Set(flatLessonIds.slice(0, count));
}

/**
 * Same idea as `deriveCompletedLessonIds`, for quizzes nested under each
 * lesson. See that function's doc comment for why the count-based
 * fallback is needed.
 */
export function deriveCompletedQuizIds(
  modules: Module[] | undefined,
  completedQuizzes:
    | number
    | Array<{ quiz_id: number; completed_at: string }>
    | undefined,
  quizzesCompletedCount: number | undefined
): Set<number> {
  if (Array.isArray(completedQuizzes)) {
    return new Set(
      completedQuizzes
        .filter(
          (q): q is { quiz_id: number; completed_at: string } =>
            typeof q === "object" &&
            q !== null &&
            typeof (q as { quiz_id?: unknown }).quiz_id === "number"
        )
        .map((q) => q.quiz_id)
    );
  }

  const count =
    quizzesCompletedCount ??
    (typeof completedQuizzes === "number" ? completedQuizzes : 0);
  if (!count || count <= 0 || !modules?.length) {
    return new Set<number>();
  }

  const flatQuizIds = modules.flatMap((module) =>
    (module.lessons || []).flatMap((lesson) =>
      (lesson.quizzes || []).map((quiz) => quiz.id)
    )
  );
  return new Set(flatQuizIds.slice(0, count));
}
