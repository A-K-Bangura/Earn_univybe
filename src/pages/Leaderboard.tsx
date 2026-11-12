import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { RatingStars } from "../components/gigs/RatingStars";
import {
  Trophy,
  Medal,
  Flame,
  Award,
  Users,
  X,
  GraduationCap,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  getLeaderboard,
  getUniversityLeaderboard,
  getFacultyLeaderboard,
  getDepartmentLeaderboard,
  getOrganizationLeaderboard,
} from "../services/leaderboard";
import { getCurrentUser } from "../services/auth";
import { getStudentProfile } from "../services/profile";
import { formatXP } from "../utils/format";
import type {
  LeaderboardData,
  UniversityLeaderboard,
  FacultyLeaderboard,
  DepartmentLeaderboard,
  OrganizationLeaderboard,
  LeaderboardEntry,
} from "../types/leaderboard";

type LeaderboardType =
  | "overall"
  | "university"
  | "faculty"
  | "department"
  | "organization";

export const Leaderboard = () => {
  const [leaderboardType, setLeaderboardType] =
    useState<LeaderboardType>("overall");
  const [limit] = useState(50);
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | number | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get current user to extract university, faculty, department, and organization IDs
  const currentUser = getCurrentUser();
  const universityId = currentUser?.university?.id;
  const facultyId = currentUser?.faculty?.id;
  const departmentId = currentUser?.department?.id;
  const organizationId = currentUser?.organization?.id;

  const { data: leaderboardData, isLoading } = useQuery<
    | LeaderboardData
    | UniversityLeaderboard
    | FacultyLeaderboard
    | DepartmentLeaderboard
    | OrganizationLeaderboard
  >({
    queryKey: [
      "leaderboard",
      leaderboardType,
      limit,
      universityId,
      facultyId,
      departmentId,
      organizationId,
    ],
    queryFn: async () => {
      switch (leaderboardType) {
        case "university":
          if (!universityId) {
            throw new Error("University ID not available");
          }
          return getUniversityLeaderboard(universityId, limit);
        case "faculty":
          if (!facultyId) {
            throw new Error("Faculty ID not available");
          }
          return getFacultyLeaderboard(facultyId, limit);
        case "department":
          if (!departmentId) {
            throw new Error("Department ID not available");
          }
          return getDepartmentLeaderboard(departmentId, limit);
        case "organization":
          if (!organizationId) {
            throw new Error("Organization ID not available");
          }
          return getOrganizationLeaderboard(organizationId, limit);
        default:
          return getLeaderboard(limit);
      }
    },
    enabled:
      leaderboardType === "overall" ||
      (leaderboardType === "university" && !!universityId) ||
      (leaderboardType === "faculty" && !!facultyId) ||
      (leaderboardType === "department" && !!departmentId) ||
      (leaderboardType === "organization" && !!organizationId),
  });

  const entries = leaderboardData?.leaderboard || [];
  const userPosition = leaderboardData?.user_position;
  const totalUsers = leaderboardData?.total_users || 0;

  // Fetch selected student profile
  const { data: selectedStudent, isLoading: isLoadingStudent } = useQuery({
    queryKey: ["student-profile", selectedStudentId],
    queryFn: () => getStudentProfile(selectedStudentId!),
    enabled: !!selectedStudentId && isModalOpen,
  });

  const handleRowClick = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudentId(null);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="w-4 h-4 md:w-6 md:h-6 text-amber-500" />;
    if (rank === 2)
      return <Medal className="w-4 h-4 md:w-6 md:h-6 text-gray-400" />;
    if (rank === 3)
      return <Medal className="w-4 h-4 md:w-6 md:h-6 text-amber-600" />;
    return null;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "from-amber-500 to-amber-600";
    if (rank === 2) return "from-gray-300 to-gray-400";
    if (rank === 3) return "from-amber-700 to-amber-800";
    return "from-gray-400 to-gray-500";
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            See how you rank among all learners
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setLeaderboardType("overall")}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "overall"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setLeaderboardType("university")}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "university"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              University
            </button>
            <button
              onClick={() => setLeaderboardType("faculty")}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "faculty"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => setLeaderboardType("department")}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "department"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Department
            </button>
            {!!organizationId && (
              <button
                onClick={() => setLeaderboardType("organization")}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                  leaderboardType === "organization"
                    ? "bg-azure-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Organization
              </button>
            )}
          </div>
        </div>

        {/* Current User Card */}
        {userPosition && (
          <div className="bg-gradient-to-r from-azure-500 to-blue-violet-500 rounded-lg shadow-md p-4 md:p-6 mb-8 text-white">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              Your Position
            </h3>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold">
                  #{userPosition.rank}
                </div>
                <div>
                  <p className="font-bold text-base md:text-lg">
                    Rank #{userPosition.rank}
                  </p>
                  <p className="text-xs md:text-sm text-white text-opacity-80">
                    Top {((1 - userPosition.percentile / 100) * 100).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-6">
                <div>
                  <p className="font-bold text-base md:text-lg">
                    {userPosition.rank}
                  </p>
                  <p className="text-xs md:text-sm text-white text-opacity-80">
                    Rank
                  </p>
                </div>
                <div>
                  <p className="font-bold text-base md:text-lg">
                    {formatXP(userPosition.xp_total)}
                  </p>
                  <p className="text-xs md:text-sm text-white text-opacity-80">
                    Total XP
                  </p>
                </div>
                <div>
                  <p className="font-bold text-base md:text-lg">
                    {userPosition.percentile.toFixed(1)}%
                  </p>
                  <p className="text-xs md:text-sm text-white text-opacity-80">
                    Percentile
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Table Header - Desktop Only */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Learner</div>
              <div className="col-span-2">Total XP</div>
              <div className="col-span-2">Streak</div>
              <div className="col-span-2">Badges</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry: LeaderboardEntry) => {
                const institutionName =
                  entry.university || entry.faculty || entry.department || "";

                return (
                  <div
                    key={entry.rank}
                    onClick={() => handleRowClick(entry.student_id)}
                    className="flex md:grid md:grid-cols-12 gap-3 md:gap-4 px-3 md:px-6 py-3 md:py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 md:col-span-1 flex items-center">
                      <div
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-xs md:text-sm ${
                          entry.rank <= 3
                            ? `bg-gradient-to-br ${getRankBadgeColor(
                                entry.rank
                              )}`
                            : "bg-gray-400"
                        }`}
                      >
                        {getRankIcon(entry.rank) || entry.rank}
                      </div>
                    </div>

                    {/* User - Mobile: Takes remaining space, Desktop: 4 columns */}
                    <div className="flex-1 md:col-span-4 flex items-center gap-2 md:gap-3 min-w-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-full flex items-center justify-center text-white font-semibold text-xs md:text-base">
                        {entry.student_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm md:text-base text-gray-900 dark:text-white truncate">
                          {entry.student_name}
                        </p>
                        {institutionName && (
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                            {institutionName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* XP - Mobile: Right aligned, Desktop: 2 columns */}
                    <div className="flex-shrink-0 md:col-span-2 flex flex-col justify-center text-right md:text-left">
                      <span className="md:hidden text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                        XP
                      </span>
                      <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                        {formatXP(entry.xp_total)}
                      </span>
                    </div>

                    {/* Streak - Desktop Only */}
                    <div className="hidden md:flex md:col-span-2 flex-col justify-center">
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {entry.streak_days || 0}
                        </span>
                      </div>
                    </div>

                    {/* Badges - Desktop Only */}
                    <div className="hidden md:flex md:col-span-2 flex-col justify-center">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {entry.badges_count}
                        </span>
                      </div>
                    </div>

                    {/* Empty column for spacing - Desktop Only */}
                    <div className="hidden md:block md:col-span-1" />
                  </div>
                );
              })}
            </div>

            {/* User Count */}
            {totalUsers > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Showing top {entries.length} of {totalUsers} learners
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No entries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Be the first to make it to the leaderboard!
            </p>
          </div>
        )}

        {/* Student Profile Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
              {isLoadingStudent ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-azure-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading profile...
                  </p>
                </div>
              ) : selectedStudent ? (
                <>
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Student Profile
                    </h2>
                    <button
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6">
                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6 text-center md:text-left">
                      <div className="relative">
                        {selectedStudent.avatar_url ? (
                          <img
                            src={selectedStudent.avatar_url}
                            alt={selectedStudent.full_name || "Student"}
                            className="w-24 h-24 rounded-full object-cover border-4 border-azure-500"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-full flex items-center justify-center text-3xl font-bold text-white border-4 border-azure-500">
                            {(
                              selectedStudent.full_name ||
                              selectedStudent.firstname ||
                              "S"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {selectedStudent.full_name ||
                            `${selectedStudent.firstname || ""} ${
                              selectedStudent.lastname || ""
                            }`.trim() ||
                            "Student"}
                        </h3>
                        {selectedStudent.bio && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {selectedStudent.bio}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm justify-center md:justify-start">
                          {selectedStudent.level && (
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-azure-500" />
                              <span className="text-gray-700 dark:text-gray-300">
                                Level {selectedStudent.level}
                              </span>
                            </div>
                          )}
                          {selectedStudent.xp_total !== undefined && (
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {formatXP(selectedStudent.xp_total)} XP
                              </span>
                            </div>
                          )}
                          {selectedStudent.streak_days !== undefined && (
                            <div className="flex items-center gap-2">
                              <Flame className="w-4 h-4 text-rose-500" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {selectedStudent.streak_days} day streak
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    {(selectedStudent.university ||
                      selectedStudent.faculty ||
                      selectedStudent.department ||
                      selectedStudent.organization) && (
                      <div className="mb-6 text-center md:text-left">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Academic Information
                        </h4>
                        <div className="space-y-2">
                          {selectedStudent.university && (
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 justify-center md:justify-start">
                              <GraduationCap className="w-4 h-4 text-azure-500" />
                              <span>
                                {typeof selectedStudent.university === "object"
                                  ? selectedStudent.university.name
                                  : selectedStudent.university}
                              </span>
                            </div>
                          )}
                          {selectedStudent.faculty && (
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 justify-center md:justify-start">
                              <BookOpen className="w-4 h-4 text-azure-500" />
                              <span>
                                {typeof selectedStudent.faculty === "object"
                                  ? selectedStudent.faculty.name
                                  : selectedStudent.faculty}
                              </span>
                            </div>
                          )}
                          {selectedStudent.department && (
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 justify-center md:justify-start">
                              <BookOpen className="w-4 h-4 text-azure-500" />
                              <span>
                                {typeof selectedStudent.department === "object"
                                  ? selectedStudent.department.name
                                  : selectedStudent.department}
                              </span>
                            </div>
                          )}
                          {selectedStudent.organization && (
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 justify-center md:justify-start">
                              <Users className="w-4 h-4 text-azure-500" />
                              <span>
                                {typeof selectedStudent.organization ===
                                "object"
                                  ? selectedStudent.organization.name
                                  : selectedStudent.organization}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Gig reputation (Round 9) — additive on the same getStudentProfile() call */}
                    {selectedStudent.gig_reputation && (
                      <div className="mb-6 text-center md:text-left">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Gig reputation
                        </h4>
                        {selectedStudent.gig_reputation.rating_count > 0 ? (
                          <>
                            <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
                              <RatingStars value={selectedStudent.gig_reputation.average_rating} />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedStudent.gig_reputation.average_rating?.toFixed(1)} ·{" "}
                                {selectedStudent.gig_reputation.rating_count} rating
                                {selectedStudent.gig_reputation.rating_count === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {selectedStudent.gig_reputation.reviews.slice(0, 3).map((review) => (
                                <div
                                  key={review.id}
                                  className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3 text-left"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {review.reviewer.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      as {review.as}
                                    </span>
                                  </div>
                                  <RatingStars value={review.rating} size="sm" />
                                  {review.review && (
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                      {review.review}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No ratings yet.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {selectedStudent.xp_total !== undefined && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Total XP
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatXP(selectedStudent.xp_total)}
                          </div>
                        </div>
                      )}
                      {selectedStudent.streak_days !== undefined && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Streak
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedStudent.streak_days} days
                          </div>
                        </div>
                      )}
                      {selectedStudent.badges_count !== undefined && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Badges
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedStudent.badges_count || 0}
                          </div>
                        </div>
                      )}
                      {selectedStudent.courses_enrolled !== undefined && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Courses
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedStudent.courses_enrolled || 0}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interests */}
                    {selectedStudent.interests &&
                      selectedStudent.interests.length > 0 && (
                        <div className="mb-6 text-center md:text-left">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Interests
                          </h4>
                          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            {selectedStudent.interests.map((interest, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300 rounded-full text-sm"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Badges */}
                    {selectedStudent.badges &&
                      selectedStudent.badges.length > 0 && (
                        <div className="mb-6 text-center md:text-left">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Badges ({selectedStudent.badges.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {selectedStudent.badges.map((badge) => (
                              <div
                                key={badge.id}
                                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center gap-3"
                              >
                                {badge.icon_url && (
                                  <img
                                    src={badge.icon_url}
                                    alt={badge.name}
                                    className="w-10 h-10 rounded-full"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                    {badge.name}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                    {badge.description}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Social Links */}
                    {selectedStudent.social_links &&
                      Object.keys(selectedStudent.social_links).length > 0 && (
                        <div className="mb-6 text-center md:text-left">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Social Links
                          </h4>
                          <div className="space-y-2 flex flex-col items-center md:items-start">
                            {selectedStudent.social_links.linkedin && (
                              <a
                                href={selectedStudent.social_links.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="text-azure-600 dark:text-azure-400 hover:underline flex items-center gap-2"
                              >
                                LinkedIn
                              </a>
                            )}
                            {selectedStudent.social_links.github && (
                              <a
                                href={selectedStudent.social_links.github}
                                target="_blank"
                                rel="noreferrer"
                                className="text-azure-600 dark:text-azure-400 hover:underline flex items-center gap-2"
                              >
                                GitHub
                              </a>
                            )}
                            {selectedStudent.social_links.twitter && (
                              <a
                                href={selectedStudent.social_links.twitter}
                                target="_blank"
                                rel="noreferrer"
                                className="text-azure-600 dark:text-azure-400 hover:underline flex items-center gap-2"
                              >
                                Twitter
                              </a>
                            )}
                            {selectedStudent.social_links.portfolio && (
                              <a
                                href={selectedStudent.social_links.portfolio}
                                target="_blank"
                                rel="noreferrer"
                                className="text-azure-600 dark:text-azure-400 hover:underline flex items-center gap-2"
                              >
                                Portfolio
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Member Since */}
                    {selectedStudent.created_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 justify-center md:justify-start">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Member since{" "}
                          {new Date(
                            selectedStudent.created_at
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Failed to load profile
                  </p>
                  <button
                    onClick={handleCloseModal}
                    className="mt-4 px-4 py-2 bg-azure-500 text-white rounded-lg hover:bg-azure-600"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};
