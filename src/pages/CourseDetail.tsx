import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { PageShell } from "../components/layout/PageShell";
import {
  Clock,
  BookOpen,
  GraduationCap,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
  Circle,
  X,
  Coins,
  Award,
} from "lucide-react";
import {
  getCourseDetail,
  enrollInCourse,
  getCourseProgress,
  getEnrollmentStatus,
} from "../services/courses";
import { deriveCompletedLessonIds } from "../utils/courseProgress";
import { evaluateCompletion } from "../utils/certificates/data";
import { formatLevel } from "../utils/roadmap";
import { requireAuthOrRedirect } from "../utils/guestGuard";
import { GuestBanner } from "../components/common/GuestBanner";
import { CourseCover } from "../components/course/CourseCover";
import { CourseRoadmapLinks } from "../components/roadmap/CourseRoadmapLinks";
import { CourseResourcesSection } from "../components/resources/CourseResourcesSection";
import { invalidateRoadmapQueries } from "../utils/roadmapQueries";
import { ApiError } from "../utils/apiError";
import type { EnrollmentState } from "../types/course";
import type { AxiosError } from "axios";
import type { ApiResponse } from "../types";

type PaymentOutcome = "success" | "processing" | "cancelled" | "expired";

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read the Monime checkout return outcome (?payment=success|processing|
  // cancelled|expired) once on mount, then keep it in local state so the
  // banner survives even after we strip the query string (so a refresh
  // doesn't re-trigger it). The query param is a display hint only — the
  // actual source of truth is enrollment_state / enrollment-status below.
  const [paymentBanner, setPaymentBanner] = useState<PaymentOutcome | null>(
    null
  );

  const invalidateCourseQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
    queryClient.invalidateQueries({ queryKey: ["course-progress", courseId] });
    queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
    // Taking any course makes the student a participant of its roadmaps.
    invalidateRoadmapQueries(queryClient);
  };

  useEffect(() => {
    const outcome = searchParams.get("payment") as PaymentOutcome | null;
    if (
      outcome === "success" ||
      outcome === "processing" ||
      outcome === "cancelled" ||
      outcome === "expired"
    ) {
      setPaymentBanner(outcome);
      if (outcome !== "processing") {
        invalidateCourseQueries();
        setSearchParams({}, { replace: true });
      }
    }
    // Read only the query param present when this page first mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll enrollment status while confirming a payment — this also re-checks
  // with Monime (unlike course-detail's enrollment_state), so a delayed
  // webhook can't strand the student on "Confirming Payment…" forever.
  const { data: enrollmentStatus } = useQuery({
    queryKey: ["enrollment-status", courseId],
    queryFn: () => getEnrollmentStatus(courseId!),
    enabled: !!courseId && paymentBanner === "processing",
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (paymentBanner === "processing" && enrollmentStatus?.state === "enrolled") {
      invalidateCourseQueries();
      setPaymentBanner("success");
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentStatus?.state]);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => getCourseDetail(courseId!),
    enabled: !!courseId,
  });

  // Fetch course progress if enrolled to get completion data
  const { data: courseProgress } = useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: () => getCourseProgress(courseId!),
    enabled: !!courseId && (!!course?.is_enrolled || !!course?.progress),
  });

  // Canonical server completion (not the percentage) decides whether a certificate is offered.
  const hasCertificate =
    !!courseProgress && evaluateCompletion(courseProgress) === "complete";

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(courseId!),
    onSuccess: (result) => {
      if (result.requires_payment) {
        // Course-detail's enrollment_state needs refreshing regardless of
        // whether we're leaving the page (checkout_url) or not (payment
        // already processing with no fresh checkout to reopen).
        invalidateCourseQueries();
        if (result.checkout_url) {
          window.location.href = result.checkout_url;
        }
        return;
      }
      invalidateCourseQueries();
      navigate(`/course/${courseId}/play`);
    },
  });

  const handleEnroll = () => {
    if (!requireAuthOrRedirect(navigate)) return;
    enrollMutation.mutate();
  };

  const enrollmentState: EnrollmentState =
    course?.enrollment_state ??
    (course?.is_enrolled || course?.progress ? "enrolled" : "available");

  const enrollButtonLabel = enrollMutation.isPending
    ? "Enrolling..."
    : enrollmentState === "payment_pending"
      ? "Continue Payment"
      : enrollmentState === "payment_processing"
        ? "Confirming Payment…"
        : course?.is_paid && course?.price != null
          ? `Enroll for ${course.currency || "SLE"} ${course.price.toFixed(2)}`
          : "Enroll Now";

  const enrollErrorRaw = enrollMutation.error;
  const enrollError =
    enrollErrorRaw &&
    typeof enrollErrorRaw === "object" &&
    "response" in enrollErrorRaw
      ? ApiError.fromAxiosError(enrollErrorRaw as AxiosError<ApiResponse>).getUserFriendlyMessage()
      : (enrollErrorRaw?.message ?? null);

  // Extract completed lesson IDs from progress. GET .../progress no longer
  // returns the raw `completed_lessons` ID array (curated away) — only the
  // `lessons_completed` count — so we derive IDs from course order instead.
  const completedLessonIds = useMemo(() => {
    return deriveCompletedLessonIds(
      course?.modules,
      courseProgress?.completed_lessons,
      courseProgress?.lessons_completed
    );
  }, [
    course?.modules,
    courseProgress?.completed_lessons,
    courseProgress?.lessons_completed,
  ]);

  // Get progress percentage from courseProgress endpoint (primary source)
  const progressPercentage = useMemo(() => {
    // Priority: courseProgress.progress_percent > courseProgress.progress_percentage > course.progress.progress_percentage
    if (courseProgress?.progress_percent !== undefined) {
      return typeof courseProgress.progress_percent === "string"
        ? parseFloat(courseProgress.progress_percent)
        : courseProgress.progress_percent;
    }
    if (courseProgress?.progress_percentage !== undefined) {
      return courseProgress.progress_percentage;
    }
    if (course?.progress?.progress_percentage !== undefined) {
      return course.progress.progress_percentage;
    }
    return 0;
  }, [courseProgress, course?.progress]);

  // Calculate accurate counts from modules/lessons data
  const courseStats = useMemo(() => {
    if (!course?.modules) {
      return {
        modulesCount: course?.meta?.modules_count || 0,
        lessonsCount: course?.meta?.lessons_count || 0,
        quizzesCount: 0,
        estimatedHours: course?.meta?.estimated_hours || 0,
      };
    }

    const modulesCount = course.modules.length;
    let lessonsCount = 0;
    let quizzesCount = 0;
    let totalMinutes = 0;

    course.modules.forEach((module) => {
      if (module.lessons) {
        lessonsCount += module.lessons.length;
        module.lessons.forEach((lesson) => {
          quizzesCount += lesson.quizzes?.length ?? lesson.quizzes_count ?? 0;
          totalMinutes +=
            lesson.estimated_duration_minutes ?? lesson.estimated_minutes ?? 0;
        });
      }
    });

    const estimatedHours = Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal

    return {
      modulesCount,
      lessonsCount,
      quizzesCount,
      estimatedHours: estimatedHours || course?.meta?.estimated_hours || 0,
    };
  }, [course]);

  if (isLoading || !course) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-3/4" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <GuestBanner />

        {paymentBanner && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start justify-between gap-4 ${
              paymentBanner === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : paymentBanner === "processing"
                  ? "bg-azure-50 dark:bg-azure-900/20 text-azure-800 dark:text-azure-300"
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
            }`}
          >
            <p className="text-sm font-medium">
              {paymentBanner === "success" &&
                "Payment confirmed — you're enrolled!"}
              {paymentBanner === "processing" &&
                "Confirming your payment… this can take a moment."}
              {paymentBanner === "cancelled" &&
                "Payment was cancelled — you can try enrolling again."}
              {paymentBanner === "expired" &&
                "The payment link expired — you can try enrolling again."}
            </p>
            <button
              onClick={() => setPaymentBanner(null)}
              aria-label="Dismiss"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate("/courses")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-500 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Courses
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8 border border-gray-200 dark:border-gray-700">
          {/* Thumbnail (branded abstract cover when the course has none) */}
          <CourseCover
            title={course.title}
            seed={course.slug || course.uuid || String(course.id)}
            thumbnailUrl={course.thumbnail_url}
            loading="eager"
            className="mb-6 h-64 w-full rounded-lg"
          />

          {/* Title and Meta */}
          <div className="mb-6">
            {course.academic_module && (
              <p className="mb-1.5 text-sm font-bold uppercase tracking-wide text-azure-500 dark:text-azure-700">
                {course.academic_module.label}
              </p>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {course.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {course.description}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {formatLevel(course.level) && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  <span>{formatLevel(course.level)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>{courseStats.lessonsCount} Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{courseStats.estimatedHours}h Estimated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{courseStats.modulesCount} Modules</span>
              </div>
              {courseStats.quizzesCount > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>{courseStats.quizzesCount} Quizzes</span>
                </div>
              )}
            </div>
          </div>

          {!!course.coin_reward && course.coin_reward > 0 && (
            <p className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Coins className="w-4 h-4" />
              Earn {course.coin_reward} Vybe Coins on completion
            </p>
          )}

          {/* Enroll/Continue Button */}
          {enrollmentState !== "enrolled" && (
            <button
              onClick={handleEnroll}
              disabled={
                enrollMutation.isPending ||
                enrollmentState === "payment_processing"
              }
              className="w-full md:w-auto px-8 py-3 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              {enrollButtonLabel}
            </button>
          )}

          {enrollError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {enrollError}
            </p>
          )}

          {/* Progress */}
          {enrollmentState === "enrolled" &&
            (course.progress || courseProgress) && (
              <div className="bg-gradient-to-br from-azure-50 to-blue-violet-50 dark:from-azure-900/20 dark:to-blue-violet-900/20 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Your Progress
                  </span>
                  <span className="text-sm font-semibold text-green-500 dark:text-green-500">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div className="h-2 bg-white dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-green-700 to-green-500 transition-all duration-500"
                    style={{
                      width: `${progressPercentage}%`,
                    }}
                  />
                </div>
                {/* <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {course.progress?.completed_lessons ||
                    courseProgress?.completed_lessons ||
                    0}{" "}
                  of {courseStats.lessonsCount} lessons completed
                </div> */}
              </div>
            )}

          {/* Continue Learning Button */}
          {enrollmentState === "enrolled" && (
            <button
              onClick={() => navigate(`/course/${courseId}/play`)}
              className="w-full md:w-auto px-8 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Continue Learning
            </button>
          )}

          {enrollmentState === "enrolled" && hasCertificate && (
            <button
              type="button"
              onClick={() =>
                navigate(`/profile/certificates/${encodeURIComponent(courseId!)}`)
              }
              className="mt-3 w-full md:w-auto md:ml-3 min-h-11 px-8 py-3 border-2 border-blue-violet-500 bg-transparent text-blue-violet-400 dark:text-blue-violet-700 hover:bg-blue-violet-900 dark:hover:bg-blue-violet-100 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Award className="w-5 h-5" />
              View certificate
            </button>
          )}
        </div>

        {/* Roadmaps this course is part of (informational: never gates the course) */}
        <CourseRoadmapLinks roadmaps={course.roadmaps} />

        {/* Course Structure */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Course Structure
          </h2>

          {course.modules && course.modules.length > 0 ? (
            course.modules.map((module, moduleIndex) => {
              // Check if module is completed (all lessons completed)
              const moduleLessons = module.lessons || [];
              const isModuleCompleted =
                moduleLessons.length > 0 &&
                moduleLessons.every(
                  (lesson) =>
                    lesson.is_completed || completedLessonIds.has(lesson.id)
                );

              return (
                <div key={module.id} className="mb-6 last:mb-0">
                  <h3
                    className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                      isModuleCompleted
                        ? "text-green-700 dark:text-green-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isModuleCompleted
                          ? "bg-green-500 text-white"
                          : "bg-azure-500 text-white"
                      }`}
                    >
                      {moduleIndex + 1}
                    </span>
                    {module.title}
                    {isModuleCompleted && (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 fill-current" />
                    )}
                  </h3>
                  <div className="ml-12 space-y-2">
                    {moduleLessons.map((lesson, lessonIndex) => {
                      const isLessonCompleted =
                        lesson.is_completed ||
                        completedLessonIds.has(lesson.id);
                      const isEnrolled = course.is_enrolled || courseProgress;
                      const canClick = isEnrolled;

                      const handleLessonClick = () => {
                        if (canClick) {
                          navigate(
                            `/course/${courseId}/module/${module.id}/lesson/${lesson.id}`
                          );
                        }
                      };

                      return (
                        <button
                          key={lesson.id}
                          onClick={handleLessonClick}
                          disabled={!canClick}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                            canClick ? "cursor-pointer" : "cursor-default"
                          } ${
                            isLessonCompleted
                              ? "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700"
                          } ${!canClick ? "opacity-60" : ""}`}
                        >
                          <span
                            className={`text-sm mt-1 ${
                              isLessonCompleted
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {moduleIndex + 1}.{lessonIndex + 1}
                          </span>
                          <div className="flex-1">
                            <h4
                              className={`text-sm font-medium ${
                                isLessonCompleted
                                  ? "text-green-700 dark:text-green-300"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {lesson.title}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {(lesson.estimated_duration_minutes ??
                                lesson.estimated_minutes) != null && (
                                <span>
                                  {lesson.estimated_duration_minutes ??
                                    lesson.estimated_minutes}{" "}
                                  min
                                </span>
                              )}
                              {(() => {
                                const quizCount =
                                  lesson.quizzes?.length ??
                                  lesson.quizzes_count ??
                                  0;
                                return (
                                  quizCount > 0 && (
                                    <span>
                                      {quizCount} quiz
                                      {quizCount > 1 ? "zes" : ""}
                                    </span>
                                  )
                                );
                              })()}
                            </div>
                          </div>
                          {isLessonCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 fill-current" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Course structure not available
            </p>
          )}
        </div>

        <CourseResourcesSection courseId={course.id} />
      </div>
    </PageShell>
  );
};
