import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { PageShell } from "../components/layout/PageShell";
import { CourseCard } from "../components/course/CourseCard";
import { BookOpen, ArrowLeft, Sparkles, TrendingUp, CheckCircle } from "lucide-react";
import { getEnrolledCourses } from "../services/dashboard";
import type { Enrollment } from "../types/dashboard";

export const EnrolledCourses = () => {
  const navigate = useNavigate();

  const { data: enrolledCourses = [], isLoading } = useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: getEnrolledCourses,
  });

  // Categorize courses into sections
  const categorizedCourses = useMemo(() => {
    const newCourses: Enrollment[] = [];
    const inProgressCourses: Enrollment[] = [];
    const completedCourses: Enrollment[] = [];

    enrolledCourses.forEach((enrollment) => {
      const progress =
        typeof enrollment.progress_percent === "string"
          ? parseFloat(enrollment.progress_percent)
          : enrollment.progress_percent || 0;

      if (progress === 0) {
        newCourses.push(enrollment);
      } else if (progress >= 100) {
        completedCourses.push(enrollment);
      } else {
        inProgressCourses.push(enrollment);
      }
    });

    return {
      new: newCourses,
      inProgress: inProgressCourses,
      completed: completedCourses,
    };
  }, [enrolledCourses]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md"
                >
                  <div className="h-40 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const totalCourses = enrolledCourses.length;
  const hasAnyCourses = totalCourses > 0;

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-500 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                My Enrolled Courses
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {totalCourses > 0
                  ? `You're enrolled in ${totalCourses} course${totalCourses !== 1 ? "s" : ""}`
                  : "You haven't enrolled in any courses yet"}
              </p>
            </div>
            <button
              onClick={() => navigate("/courses")}
              className="px-4 py-2 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Browse Courses
            </button>
          </div>
        </div>

        {!hasAnyCourses ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No enrolled courses yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start your learning journey by exploring and enrolling in courses
            </p>
            <button
              onClick={() => navigate("/courses")}
              className="inline-flex items-center gap-2 bg-azure-500 hover:bg-azure-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* New Courses Section */}
            {categorizedCourses.new.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-azure-100 dark:bg-azure-900/30 rounded-lg">
                    <Sparkles className="w-6 h-6 text-azure-600 dark:text-azure-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      New
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {categorizedCourses.new.length} course
                      {categorizedCourses.new.length !== 1 ? "s" : ""} enrolled but not started
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedCourses.new.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      course={enrollment.course}
                      enrollment={enrollment}
                      source="enrolled-new"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* In Progress Courses Section */}
            {categorizedCourses.inProgress.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      In Progress
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {categorizedCourses.inProgress.length} course
                      {categorizedCourses.inProgress.length !== 1 ? "s" : ""} you're currently learning
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedCourses.inProgress.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      course={enrollment.course}
                      enrollment={enrollment}
                      source="enrolled-in-progress"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Courses Section */}
            {categorizedCourses.completed.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      Completed
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {categorizedCourses.completed.length} course
                      {categorizedCourses.completed.length !== 1 ? "s" : ""} you've finished
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedCourses.completed.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      course={enrollment.course}
                      enrollment={enrollment}
                      source="enrolled-completed"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
};

