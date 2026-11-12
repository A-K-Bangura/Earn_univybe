import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, ChevronRight, Coins, GraduationCap } from "lucide-react";
import type { Course, Enrollment } from "../../types/dashboard";
import { debugLog } from "../../utils/debug";
import { formatLevel } from "../../utils/roadmap";
import { CourseCover } from "./CourseCover";

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;
  source?: string;
}

export const CourseCard = ({ course, enrollment, source }: CourseCardProps) => {
  const navigate = useNavigate();

  // Determine if course is enrolled (from enrollment prop or course.is_enrolled)
  const isEnrolled = !!enrollment || course.is_enrolled;

  // Get progress percentage from enrollment or course.progress
  const getProgressPercent = (): number => {
    if (enrollment) {
      const progress =
        typeof enrollment.progress_percent === "string"
          ? parseFloat(enrollment.progress_percent)
          : enrollment.progress_percent;
      return progress || 0;
    }
    if (course.progress) {
      return course.progress.progress_percent || 0;
    }
    return 0;
  };

  const progressPercent = getProgressPercent();

  // Get lesson count from course metadata or estimated_lessons_count
  const getLessonCount = (): number => {
    if (course.meta?.lessons_count) {
      return course.meta.lessons_count;
    }
    if (course.estimated_lessons_count) {
      return course.estimated_lessons_count;
    }
    return 0;
  };

  // Get estimated hours from course metadata or estimated_duration_hours
  const getEstimatedHours = (): number => {
    if (course.meta?.estimated_hours) {
      return course.meta.estimated_hours;
    }
    if (course.estimated_duration_hours) {
      return course.estimated_duration_hours;
    }
    return 0;
  };

  const lessonCount = getLessonCount();
  const estimatedHours = getEstimatedHours();
  const level = formatLevel(course.level);

  const handleClick = () => {
    const hasSavedSpot = Boolean(
      enrollment?.last_module_id && enrollment?.last_lesson_id
    );

    const fallbackDestination = isEnrolled
      ? `/course/${course.uuid}/play`
      : `/course/${course.uuid}`;

    const resolvedDestination = hasSavedSpot
      ? `/course/${course.uuid}/module/${enrollment?.last_module_id}/lesson/${enrollment?.last_lesson_id}`
      : fallbackDestination;

    debugLog("CourseCard", "Course card clicked", {
      source: source || "unknown",
      courseId: course.id,
      courseUuid: course.uuid,
      title: course.title,
      isEnrolled,
      progressPercent,
      destination: resolvedDestination,
      hasSavedSpot,
      lastModuleId: enrollment?.last_module_id,
      lastLessonId: enrollment?.last_lesson_id,
    });

    navigate(resolvedDestination, {
      state: {
        from: source || "unknown",
        courseId: course.id,
        courseUuid: course.uuid,
        timestamp: new Date().toISOString(),
        initialModuleId: hasSavedSpot ? enrollment?.last_module_id : undefined,
        initialLessonId: hasSavedSpot ? enrollment?.last_lesson_id : undefined,
      },
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={course.title}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Cover */}
      <div className="relative h-40 shrink-0 overflow-hidden">
        <CourseCover
          title={course.title}
          seed={course.slug || course.uuid || String(course.id)}
          thumbnailUrl={course.thumbnail_url}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />

        {course.is_paid !== undefined && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {course.is_paid ? (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-gray-900 shadow-sm">
                {course.currency || "SLE"} {(course.price ?? 0).toFixed(2)}
              </span>
            ) : (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-azure-300 shadow-sm">
                Free
              </span>
            )}
            {!!course.coin_reward && course.coin_reward > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-900/80 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm backdrop-blur-sm">
                <Coins className="h-3 w-3" aria-hidden />
                Earn {course.coin_reward}
              </span>
            )}
          </div>
        )}

        <span
          aria-hidden
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-gray-700 shadow-sm transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          <ChevronRight className="h-4 w-4" />
        </span>

        {isEnrolled && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
            <div
              className="h-full bg-green-400 transition-all duration-500"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {course.academic_module && (
          <p className="mb-1 truncate text-xs font-bold uppercase tracking-wide text-azure-500 dark:text-azure-700">
            {course.academic_module.label}
          </p>
        )}
        <h3 className="mb-1.5 line-clamp-2 text-lg font-semibold leading-snug text-gray-900 dark:text-white">
          {course.title}
        </h3>

        <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {course.short_description || course.description}
        </p>

        {/* Meta Info */}
        {(lessonCount > 0 || estimatedHours > 0 || level) && (
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {level && (
              <div className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" aria-hidden />
                <span>{level}</span>
              </div>
            )}
            {lessonCount > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" aria-hidden />
                <span>{lessonCount} lessons</span>
              </div>
            )}
            {estimatedHours > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden />
                <span>{estimatedHours}h</span>
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        {isEnrolled && progressPercent > 0 && progressPercent < 100 && (
          <div className="mt-3 inline-block self-start rounded-full bg-azure-900 px-3 py-1 text-xs font-medium text-azure-300 dark:bg-azure-100 dark:text-azure-700">
            In Progress - {Math.round(progressPercent)}%
          </div>
        )}
        {isEnrolled && progressPercent >= 100 && (
          <div className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Completed
          </div>
        )}
        {isEnrolled && progressPercent === 0 && (
          <div className="mt-3 inline-block self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            Not Started
          </div>
        )}
      </div>
    </div>
  );
};
