import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { StatCard } from "../components/common/StatCard";
import { CourseCard } from "../components/course/CourseCard";
import { Mascot } from "../components/common/Mascot";
import {
  Trophy,
  Flame,
  BookOpen,
  Award,
  ArrowRight,
  ArrowUpRight,
  Coins,
} from "lucide-react";
import { XPCounter } from "../components/common/XPCounter";
import { StreakIndicator } from "../components/common/StreakIndicator";
import { getDashboard, getEnrolledCourses } from "../services/dashboard";
import { getRecommendedCourses } from "../services/courses";

// WhatsApp's own mark (not a lucide icon) — this button hands the student
// off to a real WhatsApp conversation, so it carries WhatsApp's own green and
// glyph rather than a generic chat icon.
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12.004 2C6.48 2 2 6.477 2 12c0 1.76.46 3.483 1.33 4.996L2 22l5.125-1.345A9.96 9.96 0 0 0 12.004 22C17.52 22 22 17.523 22 12S17.52 2 12.004 2Zm0 18.065a8.04 8.04 0 0 1-4.097-1.118l-.294-.175-3.04.798.812-2.965-.192-.304A8.04 8.04 0 1 1 20.06 12c0 4.44-3.613 8.065-8.056 8.065Z" />
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" />
  </svg>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  // Get current user
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // Fetch dashboard data
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    retry: 1,
  });

  // Use student name from dashboard API or fallback to localStorage
  const firstName =
    dashboard?.student?.name?.split(" ")[0] || user?.firstname || "Student";

  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: getEnrolledCourses,
  });

  const { data: recommendedCourses = [] } = useQuery({
    queryKey: [
      "recommended-courses",
      user?.department?.id,
      user?.faculty?.id,
      user?.university?.id,
      user?.year_of_study || user?.level,
    ],
    queryFn: () =>
      getRecommendedCourses({
        department_id: user?.department?.id,
        faculty_id: user?.faculty?.id,
        university_id: user?.university?.id,
        level: user?.year_of_study || user?.level,
      }),
  });

  // Get current progress course (from enrollment objects)
  const inProgressCourse = enrolledCourses.find((enrollment) => {
    const progressPercent =
      typeof enrollment.progress_percent === "string"
        ? parseFloat(enrollment.progress_percent)
        : enrollment.progress_percent;
    return progressPercent < 100;
  });

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Continue your learning journey
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total XP
              </p>
              <div className="bg-gradient-to-br from-azure-500 to-blue-violet-500 p-2 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              <XPCounter
                xp={dashboard?.student?.total_xp || 0}
                animate={false}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Level {dashboard?.student?.score_level ?? 1}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Streak</p>
              <div className="bg-gradient-to-br from-rose-500 to-amber-500 p-2 rounded-lg">
                <Flame className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              <StreakIndicator
                days={dashboard?.stats?.current_streak || 0}
                size="lg"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Keep it going!
            </p>
          </div>
          <StatCard
            title="Courses"
            value={`${dashboard?.stats?.enrolled_courses || 0} enrolled`}
            icon={BookOpen}
            color="bg-gradient-to-br from-aquamarine-500 to-azure-500"
            subtitle={`${dashboard?.stats?.completed_courses || 0} completed`}
          />
          <StatCard
            title="Badges"
            value={
              dashboard?.stats?.badges_earned ||
              dashboard?.badges?.filter((b) => b.has_badge).length ||
              0
            }
            icon={Award}
            color="bg-gradient-to-br from-amber-500 to-blue-violet-500"
            subtitle="Achievements unlocked"
          />
          <button
            onClick={() => navigate("/wallet")}
            className="relative text-left bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <ArrowUpRight
              strokeWidth={3}
              className="absolute bottom-3 right-3 w-6 h-6 text-gray-500 dark:text-gray-400"
            />
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vybe Coins
              </p>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-lg">
                <Coins className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {(dashboard?.student?.coins?.available ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage wallet
            </p>
          </button>
        </div>

        {/* Continue Learning */}
        {inProgressCourse && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Continue Learning
              </h2>
              <button
                onClick={() => navigate("/courses/enrolled")}
                className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <CourseCard
              course={inProgressCourse.course}
              enrollment={inProgressCourse}
              source="dashboard-continue"
            />
          </div>
        )}

        {/* My Courses */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              My Courses
            </h2>
            <button
              onClick={() => navigate("/courses")}
              className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
            >
              Browse all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.slice(0, 3).map((enrollment) => (
                <CourseCard
                  key={enrollment.id}
                  course={enrollment.course}
                  enrollment={enrollment}
                  source="dashboard-my-courses"
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No enrolled courses yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start your learning journey by exploring available courses
              </p>
              <button
                onClick={() => navigate("/courses")}
                className="inline-flex items-center gap-2 bg-azure-500 hover:bg-azure-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Browse Courses <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Recommended Courses */}
        {recommendedCourses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recommended for You
              </h2>
              <button className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedCourses.slice(0, 3).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  source="dashboard-recommended"
                />
              ))}
            </div>
          </div>
        )}

        {/* Get Help */}
        <button
          onClick={() => navigate("/help")}
          className="group relative mb-8 w-full cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-azure-500 via-azure-500 to-rose-500 p-5 text-left shadow-lg transition-shadow hover:shadow-2xl sm:p-8 lg:p-10"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-aquamarine-400/40 blur-3xl lg:h-64 lg:w-64"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-amber-400/30 blur-3xl lg:h-56 lg:w-56"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-1/4 top-0 h-28 w-28 rounded-full bg-white/15 blur-2xl"
          />

          <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:text-left">
            <div className="min-w-0 order-2 sm:order-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Get Help
              </span>
              <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl lg:text-3xl">
                Stuck on something? We've got your back.
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-white/80 sm:text-base lg:text-lg">
                Get connected to a UniVybe guide on WhatsApp — admissions,
                registration, campus life, anything.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:bg-[#1EBE57] group-hover:shadow-md">
                <WhatsAppIcon className="h-4 w-4" />
                Get Help
              </span>
            </div>

            <div className="order-1 shrink-0 sm:order-2">
              <Mascot
                pose="hi"
                className="h-24 w-auto drop-shadow-xl sm:h-32 md:h-40 lg:h-52 xl:h-60"
              />
            </div>
          </div>
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate("/leaderboard")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left"
          >
            <Trophy className="w-8 h-8 text-azure-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Leaderboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check your ranking and compete with others
            </p>
          </button>
          <button
            onClick={() => navigate("/profile?tab=badges")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left"
          >
            <Award className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Achievements
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See your badges and accomplishments
            </p>
          </button>
          <button
            onClick={() => navigate("/wallet")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left"
          >
            <Coins className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Manage Vybe Coins
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View your balance, history, and exchange for Leones
            </p>
          </button>
        </div>
      </div>
    </PageShell>
  );
};
