import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CertificateCelebrationAction } from "../components/certificates/CertificateCelebrationAction";
import { CERTIFICATES_QUERY_KEY } from "../hooks/useCertificateCollection";
import { PageShell } from "../components/layout/PageShell";
import { OutlineSidebar } from "../components/course/OutlineSidebar";
import { MiniLessonRenderer } from "../components/course/MiniLessonRenderer";
import { JottingPad } from "../components/course/JottingPad";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  BookOpen,
  FileText,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  WifiOff,
  Coins,
  Award,
} from "lucide-react";
import { getLessonDetail, SequentialAccessError } from "../services/lessons";
import {
  getCourseDetail,
  getCourseProgress,
  updateCourseProgress,
} from "../services/courses";
import { getUserProfile } from "../services/profile";
import { useUIStore } from "../store/uiStore";
import { debugLog } from "../utils/debug";
import { OfflineQueuedError } from "../utils/db";
import {
  deriveCompletedLessonIds,
  deriveCompletedQuizIds,
} from "../utils/courseProgress";
import { QuizRenderer } from "../components/course/QuizRenderer";
import type { QuizAttemptMeta } from "../components/course/QuizRenderer";
import type { MiniLesson, LessonDetail } from "../types/lesson";
import type { CourseProgress } from "../types/course";
import type { Quiz, QuizSubmission, QuizResult } from "../types/quiz";
import type { UserProfile } from "../types/profile";
import type { CoinsAwarded } from "../types/coins";
import type { RoadmapCompletedEvent } from "../types/roadmap";
import { invalidateRoadmapQueries } from "../utils/roadmapQueries";
import {
  DEFAULT_INSPO_TYPE,
  getRandomInspirationMessage,
  isValidInspirationType,
  type InspoType,
} from "../constants/inspirationMessages";
import confettiVideo from "../assets/animations/Confetti.webm";
import successIcon from "../assets/animations/SuccessCheck.webm";

export const CoursePlayer = () => {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    moduleId?: string;
    lessonId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [quizStates, setQuizStates] = useState<
    Record<
      number,
      {
        status: "idle" | "submitting" | "success" | "error";
        result?: QuizResult;
        error?: string;
        attempt?: QuizAttemptMeta;
        progressStatus:
          | "idle"
          | "updating"
          | "success"
          | "queued"
          | "error"
          | "already_completed";
        progressError?: string;
      }
    >
  >({});
  const [lessonCompletionStatus, setLessonCompletionStatus] = useState<
    "idle" | "submitting" | "success" | "queued" | "error" | "already_completed"
  >("idle");
  const [lessonCompletionError, setLessonCompletionError] = useState<
    string | null
  >(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lessonCompletion, setLessonCompletion] = useState<{
    progress: CourseProgress;
    courseCompleted: boolean;
    coinsAwarded?: CoinsAwarded;
    roadmapsCompleted?: RoadmapCompletedEvent[];
  } | null>(null);
  const [inspirationMessage, setInspirationMessage] = useState("");

  const navigationState = useMemo(() => {
    return (
      (location.state as {
        from?: string;
        courseId?: number;
        courseUuid?: string;
        timestamp?: string;
        initialModuleId?: number;
        initialLessonId?: number;
      } | null) ?? null
    );
  }, [location.state]);

  // This will be set from the API or passed from navigation
  const activeLessonId = lessonId ? Number(lessonId) : null;

  // Fetch course detail for outline
  const { data: courseDetail } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => getCourseDetail(courseId!),
    enabled: !!courseId,
  });

  // Fetch course progress for outline/progress data
  const { data: courseProgress } = useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: () => getCourseProgress(courseId!),
    enabled: !!courseId,
  });

  // State for sequential access error
  const [sequentialAccessError, setSequentialAccessError] = useState<{
    message: string;
    details?: {
      message?: string;
      lesson_order?: number;
      module_id?: number;
      module_order?: number;
    };
  } | null>(null);

  // Fetch lesson detail when lesson ID is available
  const {
    data: lessonDetail,
    isLoading,
    error: lessonError,
  } = useQuery<LessonDetail>({
    queryKey: ["lesson-detail", activeLessonId],
    queryFn: () => getLessonDetail(activeLessonId!),
    enabled: !!activeLessonId,
    retry: false, // Don't retry on sequential access errors
  });

  // Fetch user profile for personalized messaging
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
  });

  const studentName = useMemo(() => {
    if (!userProfile) {
      return undefined;
    }

    if (userProfile.full_name && userProfile.full_name.trim()) {
      return userProfile.full_name.trim();
    }

    const firstname = userProfile.firstname?.trim();
    const lastname = userProfile.lastname?.trim();
    if (firstname || lastname) {
      return [firstname, lastname].filter(Boolean).join(" ").trim();
    }

    return userProfile.email?.split("@")?.[0];
  }, [userProfile]);

  const inspirationType = useMemo<InspoType>(() => {
    const preferences = userProfile?.preferences as
      | { inspo_type?: unknown }
      | undefined;
    const prefValue = preferences?.inspo_type;
    return isValidInspirationType(prefValue) ? prefValue : DEFAULT_INSPO_TYPE;
  }, [userProfile]);

  // Handle sequential access errors
  useEffect(() => {
    if (lessonError instanceof SequentialAccessError) {
      setSequentialAccessError({
        message: lessonError.message,
        details: lessonError.details,
      });
    } else if (lessonError) {
      setSequentialAccessError(null);
    }
  }, [lessonError]);

  useEffect(() => {
    if (showCompletionModal && lessonCompletion) {
      const message = getRandomInspirationMessage(inspirationType, studentName);
      setInspirationMessage(message);
    } else if (!showCompletionModal) {
      setInspirationMessage("");
    }
  }, [showCompletionModal, lessonCompletion, inspirationType, studentName]);

  const detailModules = courseDetail?.modules || [];
  const detailHasLessons = detailModules.some(
    (module) => (module.lessons?.length || 0) > 0
  );
  const modulesSource = detailHasLessons
    ? detailModules
    : courseProgress?.course?.modules || detailModules;

  // Extract completed lesson and quiz IDs from progress. GET .../progress
  // no longer returns the raw completed_lessons/completed_quizzes ID
  // arrays (curated away) — only lessons_completed/quizzes_completed
  // counts — so we derive IDs from course order as a fallback.
  const completedLessonIds = useMemo(() => {
    return deriveCompletedLessonIds(
      modulesSource,
      courseProgress?.completed_lessons,
      courseProgress?.lessons_completed
    );
  }, [
    modulesSource,
    courseProgress?.completed_lessons,
    courseProgress?.lessons_completed,
  ]);

  const completedQuizIds = useMemo(() => {
    return deriveCompletedQuizIds(
      modulesSource,
      courseProgress?.completed_quizzes,
      courseProgress?.quizzes_completed
    );
  }, [
    modulesSource,
    courseProgress?.completed_quizzes,
    courseProgress?.quizzes_completed,
  ]);

  const outline = useMemo(() => {
    if (!modulesSource.length) {
      return undefined;
    }

    return {
      modules: modulesSource.map((module, moduleIndex) => {
        const moduleLessons = (module.lessons || []).map(
          (lesson, lessonIndex) => {
            const isLessonCompleted = completedLessonIds.has(lesson.id);

            // Determine if lesson is locked based on sequential access rules
            // First lesson in first module is always accessible
            // Other lessons require all previous lessons in same module to be completed
            // Lessons in new modules require all lessons in all previous modules to be completed
            let isLocked = false;

            if (moduleIndex === 0 && lessonIndex === 0) {
              // First lesson in first module - always accessible
              isLocked = false;
            } else if (moduleIndex === 0) {
              // Other lessons in first module - check if all previous lessons are completed
              const previousLessons =
                module.lessons?.slice(0, lessonIndex) || [];
              isLocked = !previousLessons.every((prevLesson) =>
                completedLessonIds.has(prevLesson.id)
              );
            } else {
              // Lessons in subsequent modules
              // First check if all previous modules are fully completed
              const previousModules = modulesSource.slice(0, moduleIndex);
              const allPreviousModulesCompleted = previousModules.every(
                (prevModule) => {
                  const prevModuleLessons = prevModule.lessons || [];
                  return (
                    prevModuleLessons.length > 0 &&
                    prevModuleLessons.every((prevLesson) =>
                      completedLessonIds.has(prevLesson.id)
                    )
                  );
                }
              );

              if (!allPreviousModulesCompleted) {
                // Previous modules not completed - lesson is locked
                isLocked = true;
              } else if (lessonIndex === 0) {
                // First lesson in module - accessible if previous modules completed
                isLocked = false;
              } else {
                // Other lessons in module - check if all previous lessons in same module are completed
                const previousLessons =
                  module.lessons?.slice(0, lessonIndex) || [];
                isLocked = !previousLessons.every((prevLesson) =>
                  completedLessonIds.has(prevLesson.id)
                );
              }
            }

            // Get quizzes for this lesson from lessonDetail if it's the current lesson
            let lessonQuizzes:
              | Array<{
                  id: number;
                  title?: string;
                  order_index: number;
                  is_completed: boolean;
                }>
              | undefined;
            if (
              lessonDetail &&
              lessonDetail.id === lesson.id &&
              lessonDetail.quizzes
            ) {
              lessonQuizzes = lessonDetail.quizzes.map((quiz) => ({
                id: quiz.id,
                title:
                  quiz.question || quiz.title || `Quiz ${quiz.order_index}`,
                order_index: quiz.order_index ?? 0,
                is_completed: completedQuizIds.has(quiz.id),
              }));
            }

            return {
              id: lesson.id,
              title: lesson.title,
              order_index: lesson.order_index,
              is_completed: isLessonCompleted,
              is_locked: isLocked,
              quizzes: lessonQuizzes,
            };
          }
        );

        // Module is completed if all lessons are completed
        // Note: We'd need quiz data for all lessons to fully determine module completion
        // For now, we check if all lessons are completed
        const isModuleCompleted =
          moduleLessons.length > 0 &&
          moduleLessons.every((lesson) => lesson.is_completed);

        return {
          id: module.id,
          title: module.title,
          order_index: module.order_index,
          is_completed: isModuleCompleted,
          lessons: moduleLessons,
        };
      }),
    };
  }, [modulesSource, completedLessonIds, completedQuizIds, lessonDetail]);

  const currentModule = useMemo(() => {
    if (!modulesSource.length || !activeLessonId) {
      return undefined;
    }

    return modulesSource.find((module) =>
      module.lessons?.some((lesson) => lesson.id === activeLessonId)
    );
  }, [modulesSource, activeLessonId]);

  // Use lesson detail for lesson content
  const lessonContent = useMemo(() => {
    if (!lessonDetail) {
      return undefined;
    }

    const miniLessons = [...(lessonDetail.mini_lessons || [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    const quizzes = [...(lessonDetail.quizzes || [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    return {
      id: lessonDetail.id,
      module_id: lessonDetail.module_id,
      title: lessonDetail.title,
      mini_lessons: miniLessons,
      quizzes,
    };
  }, [lessonDetail]);

  const lessonScreens = useMemo(() => {
    if (!lessonContent) {
      return [] as Array<
        { kind: "mini"; data: MiniLesson } | { kind: "quiz"; data: Quiz }
      >;
    }

    const miniScreens = (lessonContent.mini_lessons || []).map((mini) => ({
      kind: "mini" as const,
      data: mini,
    }));

    const quizScreens = (lessonContent.quizzes || []).map((quiz) => ({
      kind: "quiz" as const,
      data: quiz,
    }));

    return [...miniScreens, ...quizScreens];
  }, [lessonContent]);

  const totalScreens = lessonScreens.length;
  const hasScreens = totalScreens > 0;
  const isLastScreen = hasScreens && currentScreenIndex === totalScreens - 1;
  const currentScreen = lessonScreens[currentScreenIndex] || null;
  const currentMiniLesson =
    currentScreen?.kind === "mini" ? currentScreen.data : undefined;
  const currentQuiz =
    currentScreen?.kind === "quiz" ? currentScreen.data : undefined;
  const isQuizScreen = Boolean(currentQuiz);
  const currentQuizState = currentQuiz ? quizStates[currentQuiz.id] : undefined;
  const isQuizNextLocked =
    isQuizScreen &&
    (!currentQuizState ||
      currentQuizState.status !== "success" ||
      (currentQuizState.progressStatus !== "success" &&
        currentQuizState.progressStatus !== "queued" &&
        currentQuizState.progressStatus !== "already_completed"));
  const canGoPrev = currentScreenIndex > 0;
  const canGoNext = currentScreenIndex < totalScreens - 1;
  // Server already has this lesson marked complete (derived from
  // GET .../progress, same source the outline's lock/checkmark state uses) —
  // re-clicking "Complete Lesson" on a review visit must not re-submit.
  const isCurrentLessonAlreadyCompleted = activeLessonId
    ? completedLessonIds.has(activeLessonId)
    : false;
  const nextButtonDisabled = isLastScreen
    ? lessonCompletionStatus === "submitting" ||
      lessonCompletionStatus === "success" ||
      lessonCompletionStatus === "queued" ||
      lessonCompletionStatus === "already_completed" ||
      isQuizNextLocked
    : !canGoNext || isQuizNextLocked;
  const nextButtonLabel = isLastScreen
    ? lessonCompletionStatus === "submitting"
      ? "Completing..."
      : lessonCompletionStatus === "success" ||
        lessonCompletionStatus === "queued" ||
        lessonCompletionStatus === "already_completed"
      ? "Lesson Completed"
      : "Complete Lesson"
    : "Next";

  // Check if current lesson is the last lesson in the last module (course completion)
  const isLastLessonInCourse = useMemo(() => {
    if (!modulesSource.length || !activeLessonId) {
      return false;
    }

    const modules = modulesSource;
    const lastModule = modules[modules.length - 1];

    if (!lastModule || !lastModule.lessons || lastModule.lessons.length === 0) {
      return false;
    }

    const lastLesson = lastModule.lessons[lastModule.lessons.length - 1];
    return lastLesson.id === activeLessonId;
  }, [modulesSource, activeLessonId]);

  const nextLessonLink = useMemo(() => {
    if (!modulesSource.length || !activeLessonId) {
      return null;
    }

    const modules = modulesSource;

    let nextLessonRoute: string | null = null;

    outer: for (
      let moduleIndex = 0;
      moduleIndex < modules.length;
      moduleIndex++
    ) {
      const module = modules[moduleIndex];
      const lessons = module.lessons || [];

      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
        const lesson = lessons[lessonIndex];
        if (lesson.id === activeLessonId) {
          const nextLesson = lessons[lessonIndex + 1];
          if (nextLesson) {
            nextLessonRoute = `/course/${courseId}/module/${module.id}/lesson/${nextLesson.id}`;
            break outer;
          }

          const nextModule = modules[moduleIndex + 1];
          if (
            nextModule &&
            nextModule.lessons &&
            nextModule.lessons.length > 0
          ) {
            const firstLesson = nextModule.lessons[0];
            nextLessonRoute = `/course/${courseId}/module/${nextModule.id}/lesson/${firstLesson.id}`;
            break outer;
          }

          // No next lesson - this is the last lesson
          nextLessonRoute = null;
          break outer;
        }
      }
    }

    return nextLessonRoute;
  }, [modulesSource, activeLessonId, courseId]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      debugLog("CoursePlayer", "Sidebar toggled", { open: next });
      return next;
    });
    useUIStore.getState().toggleMobilePanel();
  };

  // Navigate to different lesson
  const handleLessonNavigate = (moduleId: number, lessonId: number) => {
    // Check if lesson is locked in outline
    const targetModule = outline?.modules.find((m) => m.id === moduleId);
    const targetLesson = targetModule?.lessons.find((l) => l.id === lessonId);

    if (targetLesson?.is_locked) {
      // Don't navigate to locked lessons
      debugLog("CoursePlayer", "Attempted to navigate to locked lesson", {
        courseId,
        moduleId,
        lessonId,
      });
      return;
    }

    setIsSidebarOpen(false);
    setCurrentScreenIndex(0);
    setSequentialAccessError(null); // Clear any previous errors
    debugLog("CoursePlayer", "Navigating to lesson", {
      courseId,
      moduleId,
      lessonId,
    });
    navigate(`/course/${courseId}/module/${moduleId}/lesson/${lessonId}`);
  };

  // Navigate previous/next mini-lesson
  const handlePrevMiniLesson = () => {
    if (!canGoPrev) {
      debugLog(
        "CoursePlayer",
        "Attempted to go to previous screen but at start",
        {
          currentScreenIndex,
        }
      );
      return;
    }

    setCurrentScreenIndex((prev) => {
      const next = prev - 1;
      debugLog("CoursePlayer", "Screen changed", {
        direction: "previous",
        from: prev,
        to: next,
      });
      return next;
    });
  };

  const handleNextMiniLesson = () => {
    if (!canGoNext) {
      debugLog("CoursePlayer", "Attempted to go to next screen but at end", {
        currentScreenIndex,
        total: lessonScreens.length,
      });
      return;
    }

    setCurrentScreenIndex((prev) => {
      const next = prev + 1;
      debugLog("CoursePlayer", "Screen changed", {
        direction: "next",
        from: prev,
        to: next,
      });
      return next;
    });
  };

  const handleQuizSubmit = async (
    quizId: number,
    submission: QuizSubmission,
    meta: QuizAttemptMeta
  ) => {
    if (!courseId) {
      return;
    }

    setQuizStates((prev) => ({
      ...prev,
      [quizId]: {
        status: "submitting",
        attempt: meta,
        progressStatus: prev[quizId]?.progressStatus ?? "idle",
      },
    }));

    try {
      // Local quiz result – backend submit endpoint doesn't exist
      const result = {
        quiz_id: quizId,
        score: meta.isCorrect ? 1 : 0,
        percentage: meta.isCorrect ? 100 : 0,
        passed: meta.isCorrect,
        pass_threshold: 100,
        correct_answers: meta.isCorrect ? 1 : 0,
        total_questions: 1,
        xp_awarded: 0,
        time_taken_seconds: submission.time_spent_seconds,
        results: [],
        progress: {
          total_xp: 0,
          streak_days: 0,
        },
      } as QuizResult;
      debugLog("CoursePlayer", "Quiz evaluated locally", {
        quizId,
        result,
        meta,
      });

      if (completedQuizIds.has(quizId)) {
        // Server already has this quiz marked complete — don't re-submit on
        // every review/retry (would re-award XP and burn an offline-queue
        // slot for nothing). Still shows the local correct/incorrect result.
        debugLog("CoursePlayer", "Quiz already completed, skipping sync", {
          quizId,
        });
        setQuizStates((prev) => ({
          ...prev,
          [quizId]: {
            status: "success",
            result,
            attempt: meta,
            progressStatus: "already_completed",
          },
        }));
        return;
      }

      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          status: "success",
          result,
          attempt: meta,
          progressStatus: "updating",
        },
      }));

      try {
        await updateCourseProgress(courseId, {
          quiz_id: quizId,
          completed: true,
        });
        queryClient.invalidateQueries({
          queryKey: ["course-progress", courseId],
        });
        invalidateRoadmapQueries(queryClient);

        setQuizStates((prev) => ({
          ...prev,
          [quizId]: {
            ...prev[quizId],
            progressStatus: "success",
            progressError: undefined,
          },
        }));
      } catch (progressError) {
        if (progressError instanceof OfflineQueuedError) {
          debugLog("CoursePlayer", "Quiz progress queued offline", { quizId });
          setQuizStates((prev) => ({
            ...prev,
            [quizId]: {
              ...prev[quizId],
              progressStatus: "queued",
              progressError: undefined,
            },
          }));
          return;
        }
        const message =
          progressError instanceof Error
            ? progressError.message
            : "Failed to sync quiz progress. Please retry.";
        debugLog("CoursePlayer", "Quiz progress sync failed", {
          quizId,
          message,
        });
        setQuizStates((prev) => ({
          ...prev,
          [quizId]: {
            ...prev[quizId],
            progressStatus: "error",
            progressError: message,
          },
        }));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit quiz. Please try again.";
      debugLog("CoursePlayer", "Quiz submission failed", {
        quizId,
        message,
        meta,
      });
      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          status: "error",
          error: message,
          attempt: meta,
          progressStatus: prev[quizId]?.progressStatus ?? "idle",
          progressError: prev[quizId]?.progressError,
        },
      }));
    }
  };

  function renderQuizFeedback(quizId: number): ReactNode {
    const quizState = quizStates[quizId];
    if (!quizState) {
      return null;
    }

    const blocks: ReactNode[] = [];

    if (quizState.status === "submitting") {
      blocks.push(
        <div
          key="submitting"
          className="mt-4 p-4 bg-azure-50 dark:bg-azure-900/30 border border-azure-200 dark:border-azure-800 rounded-lg text-sm text-azure-700 dark:text-azure-200"
        >
          Submitting your answers...
        </div>
      );
    }

    if (quizState.status === "error" && quizState.error) {
      blocks.push(
        <div
          key="submit-error"
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-5 h-5" />
          <span>{quizState.error}</span>
        </div>
      );
    }

    if (quizState.status === "success" && quizState.result) {
      const { result } = quizState;
      blocks.push(
        <div
          key="result"
          className={`mt-4 border-2 rounded-lg p-4 space-y-3 ${
            result.passed
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.passed ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {result.passed ? "Quiz Passed" : "Quiz Attempt Recorded"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Score: {result.percentage}% • XP Awarded: {result.xp_awarded}
              </p>
            </div>
          </div>

          {result.results && result.results.length > 0 && (
            <details className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <summary className="cursor-pointer font-medium">
                Review answers
              </summary>
              <div className="mt-3 space-y-3">
                {result.results.map((entry, index) => (
                  <div
                    key={entry.question_id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      Question {index + 1}: {entry.question}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Your answer:</span>{" "}
                      {Array.isArray(entry.your_answer)
                        ? entry.your_answer.join(", ")
                        : entry.your_answer}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Correct answer:</span>{" "}
                      {Array.isArray(entry.correct_answer)
                        ? entry.correct_answer.join(", ")
                        : entry.correct_answer}
                    </p>
                    {entry.explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {entry.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      );
    }

    const progressStatus = quizState.progressStatus;

    if (progressStatus === "already_completed") {
      blocks.push(
        <div
          key="progress-already-completed"
          className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-sm text-green-700 dark:text-green-300"
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>This quiz is already completed — your earlier result still counts.</span>
        </div>
      );
    }

    if (progressStatus === "updating") {
      blocks.push(
        <div
          key="progress-updating"
          className="mt-4 p-4 bg-azure-50 dark:bg-azure-900/30 border border-azure-200 dark:border-azure-800 rounded-lg text-sm text-azure-700 dark:text-azure-200"
        >
          Syncing your course progress...
        </div>
      );
    }

    if (progressStatus === "queued") {
      blocks.push(
        <div
          key="progress-queued"
          className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3 text-sm text-amber-700 dark:text-amber-300"
        >
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>
            Saved offline — your progress and XP will sync automatically once
            you're back online.
          </span>
        </div>
      );
    }

    if (progressStatus === "error" && quizState.progressError) {
      blocks.push(
        <div
          key="progress-error"
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 space-y-3"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{quizState.progressError}</span>
          </div>
          <button
            type="button"
            onClick={() => retryQuizProgress(quizId)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium"
          >
            Retry syncing progress
          </button>
        </div>
      );
    }

    if (!blocks.length) {
      return null;
    }

    return <div className="space-y-4">{blocks}</div>;
  }

  const retryQuizProgress = async (quizId: number) => {
    if (!courseId) {
      return;
    }

    const current = quizStates[quizId];
    if (!current || current.progressStatus === "updating") {
      return;
    }

    setQuizStates((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        progressStatus: "updating",
        progressError: undefined,
      },
    }));

    try {
      await updateCourseProgress(courseId, {
        quiz_id: quizId,
        completed: true,
      });

      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          ...prev[quizId],
          progressStatus: "success",
          progressError: undefined,
        },
      }));
    } catch (error) {
      if (error instanceof OfflineQueuedError) {
        debugLog("CoursePlayer", "Quiz progress retry queued offline", {
          quizId,
        });
        setQuizStates((prev) => ({
          ...prev,
          [quizId]: {
            ...prev[quizId],
            progressStatus: "queued",
            progressError: undefined,
          },
        }));
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Failed to sync quiz progress. Please retry.";
      debugLog("CoursePlayer", "Quiz progress retry failed", {
        quizId,
        message,
      });
      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          ...prev[quizId],
          progressStatus: "error",
          progressError: message,
        },
      }));
    }
  };

  const handleCompleteLesson = async () => {
    if (!lessonContent || !courseId) {
      return;
    }

    if (isQuizNextLocked) {
      return;
    }

    if (lessonCompletionStatus === "submitting") {
      return;
    }

    if (
      lessonCompletionStatus === "success" ||
      lessonCompletionStatus === "queued" ||
      lessonCompletionStatus === "already_completed"
    ) {
      setShowCompletionModal(true);
      return;
    }

    if (isCurrentLessonAlreadyCompleted) {
      // Don't re-POST completion for a lesson the server already has marked
      // done — every review/retry visit would otherwise re-submit, which
      // could re-award XP/coins and burns an offline-queue slot for nothing.
      setLessonCompletionStatus("already_completed");
      setShowCompletionModal(true);
      return;
    }

    setLessonCompletionStatus("submitting");
    setLessonCompletionError(null);

    try {
      const { progress, course_completed, coins_awarded, roadmaps_completed } =
        await updateCourseProgress(courseId, {
          lesson_id: lessonContent.id,
          completed: true,
        });
      queryClient.invalidateQueries({
        queryKey: ["course-progress", courseId],
      });
      // Roadmap progress and the current course derive from course completion.
      invalidateRoadmapQueries(queryClient);
      if (course_completed) {
        // A newly completed course joins the certificate collection.
        queryClient.invalidateQueries({ queryKey: [CERTIFICATES_QUERY_KEY] });
      }
      if (coins_awarded) {
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
      }

      setLessonCompletion({
        progress,
        courseCompleted: course_completed,
        coinsAwarded: coins_awarded,
        roadmapsCompleted: roadmaps_completed,
      });
      setLessonCompletionStatus("success");
      setShowCompletionModal(true);
    } catch (error) {
      if (error instanceof OfflineQueuedError) {
        setLessonCompletion(null);
        setLessonCompletionStatus("queued");
        setShowCompletionModal(true);
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark lesson complete. Please try again.";
      setLessonCompletionStatus("error");
      setLessonCompletionError(message);
    }
  };

  const handleCompletionContinue = () => {
    setShowCompletionModal(false);
    setLessonCompletionStatus("idle");
    setLessonCompletionError(null);

    // If course is completed or it's the last lesson, go to course details page
    if (lessonCompletion?.courseCompleted || isLastLessonInCourse) {
      navigate(`/course/${courseId}`, { replace: true });
    } else if (nextLessonLink) {
      navigate(nextLessonLink, { replace: true });
    } else {
      // Fallback to course details page
      navigate(`/course/${courseId}`, { replace: true });
    }

    setLessonCompletion(null);
  };

  // If no lesson selected, redirect to first lesson
  useEffect(() => {
    debugLog("CoursePlayer", "Course player mounted", {
      courseId,
      lessonId,
      navigationState,
    });
  }, [courseId, lessonId, navigationState]);

  useEffect(() => {
    if (!courseId || lessonId) {
      return;
    }

    if (navigationState?.initialModuleId && navigationState?.initialLessonId) {
      debugLog("CoursePlayer", "Restoring saved lesson from navigation state", {
        courseId,
        moduleId: navigationState.initialModuleId,
        lessonId: navigationState.initialLessonId,
      });
      navigate(
        `/course/${courseId}/module/${navigationState.initialModuleId}/lesson/${navigationState.initialLessonId}`,
        { replace: true }
      );
    }
  }, [courseId, lessonId, navigationState, navigate]);

  // Find the first incomplete lesson in the course
  const findFirstIncompleteLesson = useMemo(() => {
    if (!outline || !courseProgress) return null;

    // If there's a last_lesson_id, check if it's completed
    if (courseProgress.last_lesson_id) {
      const lastLessonCompleted = completedLessonIds.has(
        courseProgress.last_lesson_id
      );

      // If last lesson is not completed, return it
      if (!lastLessonCompleted) {
        // Find the module containing this lesson
        for (const module of outline.modules) {
          const lesson = module.lessons.find(
            (l) => l.id === courseProgress.last_lesson_id
          );
          if (lesson) {
            return { moduleId: module.id, lessonId: lesson.id };
          }
        }
      }
    }

    // Find the first incomplete lesson in order
    for (const module of outline.modules) {
      for (const lesson of module.lessons) {
        if (!lesson.is_completed) {
          return { moduleId: module.id, lessonId: lesson.id };
        }
      }
    }

    // If all lessons are completed, return the last lesson
    const lastModule = outline.modules[outline.modules.length - 1];
    if (lastModule && lastModule.lessons.length > 0) {
      const lastLesson = lastModule.lessons[lastModule.lessons.length - 1];
      return { moduleId: lastModule.id, lessonId: lastLesson.id };
    }

    // Fallback to first lesson
    if (outline.modules.length > 0 && outline.modules[0].lessons.length > 0) {
      const firstModule = outline.modules[0];
      const firstLesson = firstModule.lessons[0];
      return { moduleId: firstModule.id, lessonId: firstLesson.id };
    }

    return null;
  }, [outline, courseProgress, completedLessonIds]);

  useEffect(() => {
    if (navigationState?.initialLessonId || !outline || !courseProgress) {
      return;
    }

    if (!activeLessonId && findFirstIncompleteLesson) {
      debugLog(
        "CoursePlayer",
        "No active lesson detected. Redirecting to first incomplete lesson",
        {
          moduleId: findFirstIncompleteLesson.moduleId,
          lessonId: findFirstIncompleteLesson.lessonId,
          lastLessonId: courseProgress.last_lesson_id,
        }
      );
      navigate(
        `/course/${courseId}/module/${findFirstIncompleteLesson.moduleId}/lesson/${findFirstIncompleteLesson.lessonId}`,
        { replace: true }
      );
    }
  }, [
    activeLessonId,
    outline,
    courseProgress,
    courseId,
    navigate,
    navigationState,
    findFirstIncompleteLesson,
  ]);

  useEffect(() => {
    if (courseDetail) {
      const moduleCount = courseDetail.modules?.length || 0;
      const lessonCount = courseDetail.modules?.reduce(
        (total, module) => total + (module.lessons?.length || 0),
        0
      );
      debugLog("CoursePlayer", "Course detail loaded", {
        courseId,
        modules: moduleCount,
        lessons: lessonCount,
      });
    }
  }, [courseDetail, courseId]);

  useEffect(() => {
    if (lessonDetail) {
      debugLog("CoursePlayer", "Lesson detail loaded", {
        lessonId: lessonDetail.id,
        moduleId: lessonDetail.module_id,
        miniLessons: lessonDetail.mini_lessons?.length || 0,
      });
    }
  }, [lessonDetail]);

  useEffect(() => {
    if (activeLessonId) {
      debugLog("CoursePlayer", "Active lesson updated", { activeLessonId });
    }
  }, [activeLessonId]);

  useEffect(() => {
    if (!currentMiniLesson) {
      return;
    }

    const lessonType =
      "type" in currentMiniLesson
        ? (currentMiniLesson as { type?: string }).type
        : currentMiniLesson.content_type;

    debugLog("CoursePlayer", "Mini-lesson focus updated", {
      index: currentScreenIndex,
      miniLessonId: currentMiniLesson.id,
      type: lessonType,
    });
  }, [currentMiniLesson, currentScreenIndex]);

  useEffect(() => {
    if (lessonContent?.id) {
      setCurrentScreenIndex(0);
      setQuizStates({});
      setLessonCompletionStatus("idle");
      setLessonCompletionError(null);
      setLessonCompletion(null);
      setShowCompletionModal(false);
    }
  }, [lessonContent?.id]);

  const handleToggleNotes = () => {
    setIsNotesOpen((prev) => {
      const next = !prev;
      debugLog("CoursePlayer", "Notes panel toggled", { open: next });
      return next;
    });
  };

  const closeNotes = (context: string) => {
    setIsNotesOpen(false);
    debugLog("CoursePlayer", "Notes panel closed", { context });
  };

  const currentQuizFeedback = currentQuiz
    ? renderQuizFeedback(currentQuiz.id)
    : null;

  // Show sequential access error if present
  if (sequentialAccessError && !isLoading) {
    return (
      <PageShell showTopNav={false} showBottomNav={false}>
        <div className="flex justify-center items-center h-dvh bg-gray-50 dark:bg-gray-900">
          <div className="max-w-2xl w-full mx-4">
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-8">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Lesson Locked
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {sequentialAccessError.message ||
                      "You must complete all previous lessons before accessing this lesson."}
                  </p>
                  {sequentialAccessError.details?.message && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {sequentialAccessError.details.message}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        // Navigate to first incomplete lesson
                        if (findFirstIncompleteLesson) {
                          navigate(
                            `/course/${courseId}/module/${findFirstIncompleteLesson.moduleId}/lesson/${findFirstIncompleteLesson.lessonId}`,
                            { replace: true }
                          );
                        } else {
                          navigate(`/course/${courseId}`, { replace: true });
                        }
                      }}
                      className="px-6 py-2 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Go to Next Available Lesson
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/course/${courseId}`, { replace: true })
                      }
                      className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                    >
                      Back to Course
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // Loading state
  if (isLoading || !lessonContent) {
    return (
      <PageShell showTopNav={false} showBottomNav={false}>
        <div className="flex justify-center items-center h-dvh">
          <div className="animate-pulse text-gray-600 dark:text-gray-400">
            Loading lesson...
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showTopNav={false} showBottomNav={false}>
      <div className="flex h-dvh overflow-hidden">
        {/* Outline Sidebar */}
        <OutlineSidebar
          outline={outline || { modules: [] }}
          currentLessonId={activeLessonId}
          currentModuleId={currentModule?.id || null}
          onNavigate={handleLessonNavigate}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Close course outline" : "Open course outline"}
              className="md:hidden shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
            >
              <Menu
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-all duration-300 ${
                  isSidebarOpen
                    ? "opacity-0 rotate-90 scale-0"
                    : "opacity-100 rotate-0 scale-100"
                }`}
              />
              <X
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 absolute top-2 left-2 transition-all duration-300 ${
                  isSidebarOpen
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 rotate-90 scale-0"
                }`}
              />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white break-words">
                {lessonContent.title}
              </h1>
              {currentModule && (
                <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                  {currentModule.title}
                </p>
              )}
            </div>
          </div>

          {/* Screen-position progress bar — NOT lesson/course completion.
              Reaching the end here must never imply the lesson is complete. */}
          {hasScreens && (
            <div
              role="progressbar"
              aria-label="Lesson progress"
              aria-valuemin={1}
              aria-valuemax={totalScreens}
              aria-valuenow={currentScreenIndex + 1}
              className="h-1 w-full shrink-0 bg-gray-200 dark:bg-gray-700"
            >
              <div
                className="h-full bg-green-500 transition-[width] duration-300"
                style={{
                  width: `${((currentScreenIndex + 1) / totalScreens) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Mini-Lesson and Quiz Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-gray-900 px-4 py-4 md:px-8 md:py-8">
            <div className="max-w-3xl mx-auto space-y-6 pb-6">
              {currentScreen ? (
                currentScreen.kind === "mini" ? (
                  <MiniLessonRenderer miniLesson={currentScreen.data} />
                ) : currentQuiz ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                      Quick check
                    </p>
                    <QuizRenderer
                      className=""
                      quiz={currentQuiz}
                      onSubmit={(submission, meta) =>
                        handleQuizSubmit(currentQuiz.id, submission, meta)
                      }
                      isSubmitting={
                        quizStates[currentQuiz.id]?.status === "submitting"
                      }
                    />
                    {currentQuizFeedback && (
                      <div className="mt-2">{currentQuizFeedback}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Select a lesson from the outline to begin.
                  </div>
                )
              ) : (
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Select a lesson from the outline to begin.
                </div>
              )}
            </div>
          </div>

          {/* Lesson toolbar */}
          {hasScreens && (
            <>
              <div
                className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between gap-2"
                style={{
                  paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
                }}
              >
                <button
                  onClick={handlePrevMiniLesson}
                  disabled={!canGoPrev}
                  aria-label="Previous screen"
                  className="shrink-0 flex items-center justify-center w-11 h-11 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/course/${courseId}`)}
                    aria-label="Course outline"
                    className="flex items-center justify-center w-11 h-11 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Course outline"
                  >
                    <BookOpen className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleToggleNotes}
                    aria-label="Toggle notes"
                    aria-pressed={isNotesOpen}
                    className={`flex items-center justify-center w-11 h-11 rounded-lg transition-colors ${
                      isNotesOpen
                        ? "bg-azure-500 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title="Toggle notes"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>

                {isLastScreen ? (
                  <button
                    onClick={handleCompleteLesson}
                    disabled={nextButtonDisabled}
                    aria-label={nextButtonLabel}
                    className="shrink-0 flex items-center gap-2 px-4 h-11 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <span className="whitespace-nowrap">
                      {lessonCompletionStatus === "submitting"
                        ? "Completing…"
                        : lessonCompletionStatus === "success" ||
                          lessonCompletionStatus === "queued" ||
                          lessonCompletionStatus === "already_completed"
                        ? "Completed"
                        : "Complete"}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleNextMiniLesson}
                    disabled={nextButtonDisabled}
                    aria-label="Next screen"
                    className="shrink-0 flex items-center justify-center w-11 h-11 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
              {isLastScreen &&
                lessonCompletionStatus === "error" &&
                lessonCompletionError && (
                  <p className="px-3 pb-2 text-sm text-red-600 dark:text-red-400">
                    {lessonCompletionError}
                  </p>
                )}
            </>
          )}
        </div>

        {/* Notes Panel - Desktop */}
        {isNotesOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => closeNotes("backdrop")}
            />

            {/* Notes Sidebar */}
            <div
              className={`
                ${isNotesOpen ? "translate-x-0" : "translate-x-full"}
                fixed md:sticky top-0 right-0 h-full w-full md:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 md:shadow-none transition-transform duration-300
              `}
            >
              <div className="flex flex-col h-full">
                {/* Notes Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Your Notes
                  </h2>
                  <button
                    onClick={() => closeNotes("header-close")}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Notes Content */}
                <div className="flex-1 overflow-hidden">
                  {activeLessonId && <JottingPad lessonId={activeLessonId} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {showCompletionModal && lessonCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          {/* Confetti animation for course completion */}
          {(lessonCompletion?.courseCompleted || isLastLessonInCourse) && (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            >
              <source src={confettiVideo} type="video/webm" />
            </video>
          )}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute -top-10 left-1/4 w-24 h-24 bg-amber-400/40 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-azure-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-rose-500/30 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="relative z-10 w-[92%] md:max-w-xl mx-auto px-6 py-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700 max-h-[92dvh] overflow-y-auto">
          <div className="flex justify-center mb-6"> <video
            autoPlay
            loop
            muted
            playsInline
            className="w-24 h-24 object-contain"
            >
              <source src={successIcon} type="video/webm" />
            </video>
          </div>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
              {lessonCompletion?.courseCompleted || isLastLessonInCourse
                ? "Course Completed!"
                : "Lesson Complete!"}
            </h2>
            {lessonCompletion?.courseCompleted || isLastLessonInCourse ? (
              <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                Outstanding work! You've completed every lesson in this course.
              </p>
            ) : null}
            {lessonCompletion?.coinsAwarded && (
              <div className="flex items-center justify-center gap-3 mb-6 py-4 px-4 rounded-xl bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 border border-amber-300 dark:border-amber-700">
                <Coins className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  +{lessonCompletion.coinsAwarded.amount} Vybe Coins earned!
                </p>
              </div>
            )}
            {/* Shown only when this very request finished a roadmap. */}
            {lessonCompletion?.roadmapsCompleted?.map((roadmap) => (
              <div
                key={roadmap.id}
                className="own-links mb-6 rounded-xl border border-blue-violet-600 bg-blue-violet-900 px-4 py-4 text-center dark:border-blue-violet-300 dark:bg-blue-violet-100"
              >
                <Award className="mx-auto mb-1 h-8 w-8 text-blue-violet-400 dark:text-blue-violet-700" />
                <p className="text-lg font-bold text-blue-violet-200 dark:text-blue-violet-800">
                  Roadmap complete!
                </p>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                  You finished {roadmap.title} and earned the{" "}
                  <strong>{roadmap.badge.name}</strong> badge.
                </p>
                <Link
                  to={`/roadmaps/${roadmap.uuid}`}
                  className="mt-2 inline-block text-sm font-semibold text-blue-violet-400 underline dark:text-blue-violet-700"
                >
                  View roadmap
                </Link>
              </div>
            ))}
            <div className="grid grid-cols-1 gap-2 mb-4">
              <div className=" rounded-xl text-center">
                <p className="text-[.75rem] uppercase ml-2 inline-block tracking-wide text-gray-500 dark:text-gray-400">
                  XP Earned:
                </p>
                <p className="text-lg inline font-semibold text-amber-600 dark:text-amber-400">
                  {lessonCompletion?.progress?.xp_earned ??
                    lessonCompletion?.progress?.xp_awarded ??
                    0}
                </p>
              </div>
              <div className=" rounded-xl text-center">
                <p className="text-xs uppercase inline-block tracking-wide text-gray-500 dark:text-gray-400">
                  Course Progress:
                </p>
                <p className="text-lg inline font-semibold text-azure-600 dark:text-azure-400">
                  {(() => {
                    const raw =
                      lessonCompletion?.progress?.progress_percentage ??
                      lessonCompletion?.progress?.progress_percent ??
                      0;
                    const percent =
                      typeof raw === "string"
                        ? parseFloat(raw)
                        : typeof raw === "number"
                        ? raw
                        : 0;
                    return `${Math.round(percent)}%`;
                  })()}
                </p>
              </div>
              <div className=" rounded-xl text-center">
                <p className="text-xs uppercase inline-block tracking-wide text-gray-500 dark:text-gray-400">
                  Current Streak:
                </p>
                <p className="text-lg inline font-semibold text-rose-600 dark:text-rose-400">
                  {lessonCompletion?.progress?.streak_count ?? 0}
                </p>
              </div>
            </div>
            {!(lessonCompletion?.courseCompleted || isLastLessonInCourse) && (
              <blockquote className="text-center italic text-gray-700 dark:text-gray-300 mb-6">
                {inspirationMessage || "Keep going—you've got this!"}
              </blockquote>
            )}
            {courseId && (lessonCompletion?.courseCompleted || isLastLessonInCourse) && (
              <div className="mb-3">
                <CertificateCelebrationAction
                  courseId={courseId}
                  expectedComplete={!!lessonCompletion?.courseCompleted}
                />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCompletionContinue}
                className="flex-1 px-6 py-3 bg-linear-to-r from-azure-500 to-blue-violet-600 hover:from-azure-600 hover:to-blue-violet-600 text-white rounded-xl font-semibold shadow-lg transition-transform transform hover:-translate-y-0.5"
              >
                {lessonCompletion?.courseCompleted || isLastLessonInCourse
                  ? "Finish"
                  : "Continue Learning"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCompletionModal && lessonCompletionStatus === "already_completed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative z-10 w-full md:max-w-md mx-auto px-6 py-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Lesson Already Completed
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You've already completed this lesson — nice work reviewing it
              again.
            </p>
            {courseProgress && (
              <div className="mb-6 py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Course Progress
                </p>
                <p className="text-lg font-semibold text-azure-600 dark:text-azure-400">
                  {(() => {
                    const raw =
                      courseProgress.progress_percentage ??
                      courseProgress.progress_percent ??
                      0;
                    const percent =
                      typeof raw === "string" ? parseFloat(raw) : raw;
                    return `${Math.round(percent)}%`;
                  })()}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={handleCompletionContinue}
              className="w-full px-6 py-3 bg-linear-to-r from-azure-500 to-blue-violet-600 hover:from-azure-600 hover:to-blue-violet-600 text-white rounded-xl font-semibold shadow-lg transition-transform transform hover:-translate-y-0.5"
            >
              {isLastLessonInCourse ? "Finish" : "Continue Learning"}
            </button>
          </div>
        </div>
      )}
      {showCompletionModal && !lessonCompletion && lessonCompletionStatus === "queued" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative z-10 w-full md:max-w-md mx-auto px-6 py-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Saved Offline
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You're offline right now, so this lesson was saved on your
              device. Your progress and XP will sync automatically as soon as
              you're back online.
            </p>
            <button
              type="button"
              onClick={handleCompletionContinue}
              className="w-full px-6 py-3 bg-linear-to-r from-azure-500 to-blue-violet-600 hover:from-azure-600 hover:to-blue-violet-600 text-white rounded-xl font-semibold shadow-lg transition-transform transform hover:-translate-y-0.5"
            >
              Continue Learning
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
};
