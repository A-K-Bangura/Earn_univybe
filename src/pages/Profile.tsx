import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { RatingStars } from "../components/gigs/RatingStars";
import { CertificatesProfileSection } from "../components/certificates/CertificatesProfileSection";
import {
  User,
  Award,
  Settings,
  Trophy,
  Flame,
  BookOpen,
  GraduationCap,
  Clock,
  TrendingUp,
  LogOut,
  Edit,
  X,
  Phone,
  Calendar,
  Link as LinkIcon,
  Coins,
  ArrowUpRight,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { getUserProfile, updateProfile } from "../services/profile";
import { uploadAvatar } from "../services/upload";
import {
  getGamificationDashboard,
  getAchievements,
} from "../services/gamification";
import { getDashboard } from "../services/dashboard";
import { logout as authLogout } from "../services/auth";
import {
  getUniversities,
  getFaculties,
  getDepartments,
} from "../services/onboarding";
import { useUIStore } from "../store/uiStore";
import { formatXP } from "../utils/format";
import { formatRelativeTime } from "../utils/format";
import type { UpdateProfileData } from "../types/profile";
import {
  DEFAULT_INSPO_TYPE,
  INSPIRATION_OPTIONS,
  getSampleInspirationMessage,
  isValidInspirationType,
  type InspoType,
} from "../constants/inspirationMessages";

export const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "overview" | "badges" | "settings"
  >("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateProfileData>({});
  const [interestInput, setInterestInput] = useState("");
  const [preferencesForm, setPreferencesForm] = useState<{
    inspo_type: InspoType;
  }>({
    inspo_type: DEFAULT_INSPO_TYPE,
  });
  const { darkMode, toggleDarkMode, lowBandwidthMode, toggleLowBandwidthMode } =
    useUIStore();

  // Handle tab query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "badges" ||
      tabParam === "settings" ||
      tabParam === "overview"
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
  });

  const { data: gamificationData, isLoading: isGamificationLoading } = useQuery(
    {
      queryKey: ["gamification-dashboard"],
      queryFn: getGamificationDashboard,
    }
  );

  const { data: achievementsData, isLoading: isAchievementsLoading } = useQuery(
    {
      queryKey: ["achievements", 20],
      queryFn: () => getAchievements(20),
    }
  );

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const isLoading =
    isProfileLoading ||
    isGamificationLoading ||
    isAchievementsLoading ||
    isDashboardLoading;

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setIsEditModalOpen(false);
      setEditFormData({});
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  // Fetch universities, faculties, departments for edit form
  const { data: universities = [] } = useQuery({
    queryKey: ["universities"],
    queryFn: getUniversities,
  });

  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties", editFormData.university_id],
    queryFn: () => getFaculties(editFormData.university_id as number),
    enabled: !!editFormData.university_id,
  });

  const { data: departments = [] } = useQuery({
    queryKey: [
      "departments",
      editFormData.university_id,
      editFormData.faculty_id,
    ],
    queryFn: () =>
      getDepartments(
        editFormData.university_id as number,
        editFormData.faculty_id as number
      ),
    enabled: !!editFormData.university_id && !!editFormData.faculty_id,
  });

  // Initialize edit form when modal opens
  useEffect(() => {
    if (isEditModalOpen && profile) {
      setEditFormData({
        firstname: profile.firstname || "",
        lastname: profile.lastname || "",
        phone: profile.phone || "",
        date_of_birth: profile.date_of_birth || "",
        gender: profile.gender,
        bio: profile.bio || "",
        interests: profile.interests || [],
        university_id: profile.university?.id,
        faculty_id: profile.faculty?.id,
        department_id: profile.department?.id,
        student_id: profile.student_id || "",
        // profile.level/year_of_study hold the raw academic level string
        // (e.g. "300"), not a literal year — convert to a 1-10 year number.
        year_of_study:
          profile.level && /^\d+$/.test(profile.level)
            ? parseInt(profile.level, 10) / 100
            : undefined,
        social_links: profile.social_links || {},
      });
    }
  }, [isEditModalOpen, profile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const preferences = profile.preferences as
      | { inspo_type?: unknown }
      | undefined;
    const prefValue = isValidInspirationType(preferences?.inspo_type)
      ? preferences?.inspo_type
      : DEFAULT_INSPO_TYPE;

    setPreferencesForm((current) =>
      current.inspo_type === prefValue ? current : { inspo_type: prefValue }
    );
  }, [profile]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(editFormData);
  };

  const handlePreferencesSave = () => {
    if (!profile) {
      return;
    }

    const preferencesData = profile.preferences as
      | { inspo_type?: unknown }
      | undefined;

    const currentValue: InspoType = isValidInspirationType(
      preferencesData?.inspo_type
    )
      ? preferencesData?.inspo_type
      : DEFAULT_INSPO_TYPE;

    if (preferencesForm.inspo_type === currentValue) {
      return;
    }

    const updatedPreferences: Record<string, unknown> = {
      ...(profile.preferences as Record<string, unknown> | undefined),
      inspo_type: preferencesForm.inspo_type,
    };

    updatePreferencesMutation.mutate({
      preferences: updatedPreferences,
    });
  };

  const handleAddInterest = () => {
    if (
      interestInput.trim() &&
      editFormData.interests &&
      editFormData.interests.length < 10
    ) {
      setEditFormData({
        ...editFormData,
        interests: [...(editFormData.interests || []), interestInput.trim()],
      });
      setInterestInput("");
    }
  };

  const handleRemoveInterest = (index: number) => {
    if (editFormData.interests) {
      setEditFormData({
        ...editFormData,
        interests: editFormData.interests.filter((_, i) => i !== index),
      });
    }
  };

  const updateAvatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Also update user in localStorage
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const handleLogout = () => {
    authLogout();
    queryClient.clear();
    navigate("/auth/login");
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    // Note: Dark mode is now handled by UI store, not API
  };

  const handleLowBandwidthToggle = () => {
    toggleLowBandwidthMode();
    // Note: Low bandwidth mode is now handled by UI store, not API
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (only jpeg, png, webp allowed for avatars)
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (max 5MB for Cloudinary upload)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      alert("Image size must be less than 5MB");
      return;
    }

    // Validate minimum file size
    if (file.size < 1) {
      alert("File size must be at least 1 byte");
      return;
    }

    try {
      updateAvatarMutation.mutate(file);
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Failed to upload avatar. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!profile) return null;

  const rawInspirationPreference = (
    profile.preferences as { inspo_type?: unknown } | undefined
  )?.inspo_type;

  const currentInspoType: InspoType = isValidInspirationType(
    rawInspirationPreference
  )
    ? rawInspirationPreference
    : DEFAULT_INSPO_TYPE;

  const preferencesChanged = preferencesForm.inspo_type !== currentInspoType;

  const selectedInspirationOption = INSPIRATION_OPTIONS.find(
    (option) => option.value === preferencesForm.inspo_type
  );

  const preferencePreview = getSampleInspirationMessage(
    preferencesForm.inspo_type,
    profile.full_name || profile.firstname || profile.email
  );

  const preferenceErrorMessage =
    updatePreferencesMutation.error instanceof Error
      ? updatePreferencesMutation.error.message
      : null;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-linear-to-r from-azure-500 to-blue-violet-500 rounded-lg shadow-md p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-6 text-center md:text-left">
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.name || "Profile"}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white border-opacity-30"
                />
              ) : (
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-white border-opacity-30">
                  {(
                    profile.full_name ||
                    profile.name ||
                    profile.firstname ||
                    profile.email
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer hover:bg-gray-100 transition-colors shadow-lg">
                <Settings className="w-4 h-4 text-gray-700" />
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={updateAvatarMutation.isPending}
                />
              </label>
              {updateAvatarMutation.isPending && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 w-full">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {profile.full_name ||
                  (profile.firstname && profile.lastname
                    ? `${profile.firstname} ${profile.lastname}`
                    : profile.name || profile.email)}
              </h1>
              <div className="space-y-1 text-white text-opacity-90">
                <p className="font-medium">{profile.email}</p>
                {profile.university && (
                  <p>
                    {typeof profile.university === "object"
                      ? profile.university.name
                      : profile.university}{" "}
                    {profile.faculty &&
                      (typeof profile.faculty === "object"
                        ? `• ${profile.faculty.name}`
                        : `• ${profile.faculty}`)}{" "}
                    {profile.department &&
                      (typeof profile.department === "object"
                        ? `• ${profile.department.name}`
                        : `• ${profile.department}`)}
                  </p>
                )}
                {profile.level && (
                  <p>
                    Level:{" "}
                    {/^\d+$/.test(profile.level)
                      ? `Year ${parseInt(profile.level, 10) / 100}`
                      : profile.level}
                  </p>
                )}
                {profile.profile_completion !== undefined && (
                  <p>Profile Completion: {profile.profile_completion}%</p>
                )}
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-white text-5xl md:text-6xl font-bold">
                {gamificationData?.xp_stats?.score_level ??
                  profile.score_level ??
                  0}
              </div>
              <div className="text-white text-opacity-80">Level</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "badges", label: "Badges", icon: Award },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? "border-azure-500 text-azure-600 dark:text-azure-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Total XP
                  </span>
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatXP(
                    gamificationData?.xp_stats?.total_xp ||
                      profile.xp_total ||
                      profile.stats?.total_xp ||
                      0
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Current Streak
                  </span>
                  <Flame className="w-8 h-8 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {gamificationData?.streak_stats?.current_streak ||
                    profile.current_streak ||
                    profile.streak_days ||
                    profile.stats?.current_streak ||
                    0}{" "}
                  days
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Best:{" "}
                  {gamificationData?.streak_stats?.longest_streak ||
                    profile.longest_streak ||
                    profile.stats?.longest_streak ||
                    0}{" "}
                  days
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Lessons Completed
                  </span>
                  <BookOpen className="w-8 h-8 text-azure-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.stats?.lessons_completed ||
                    profile.stats?.lessons_completed ||
                    0}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Quizzes Completed
                  </span>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.stats?.quizzes_passed ||
                    profile.stats?.quizzes_completed ||
                    0}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Courses Enrolled
                  </span>
                  <GraduationCap className="w-8 h-8 text-blue-violet-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.stats?.enrolled_courses ||
                    profile.stats?.courses_enrolled ||
                    0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {dashboardData?.stats?.completed_courses ||
                    profile.stats?.courses_completed ||
                    0}{" "}
                  completed
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Study Time
                  </span>
                  <Clock className="w-8 h-8 text-aquamarine-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.stats?.study_time_hours?.toFixed(1) || "0.0"}h
                </div>
              </div>

              <button
                onClick={() => navigate("/wallet")}
                className="relative text-left bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <ArrowUpRight
                  strokeWidth={3}
                  className="absolute bottom-3 right-3 w-6 h-6 text-gray-500 dark:text-gray-400"
                />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Vybe Coins
                  </span>
                  <Coins className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(profile.coins?.available ?? 0).toLocaleString()}
                </div>
              </button>
            </div>

            {/* Gig reputation (Round 9) — additive on the same getUserProfile() call, no new query */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Gig reputation
              </h2>
              {profile.gig_reputation && profile.gig_reputation.rating_count > 0 ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <RatingStars value={profile.gig_reputation.average_rating} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {profile.gig_reputation.average_rating?.toFixed(1)} ·{" "}
                      {profile.gig_reputation.rating_count} rating
                      {profile.gig_reputation.rating_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {profile.gig_reputation.reviews.slice(0, 3).map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3"
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
                  No ratings yet. Ratings may come from gigs you worked on or gigs you posted.
                </p>
              )}
            </div>

            {/* Certificates: generated in the browser from completed courses */}
            <CertificatesProfileSection />

            {/* Quick links */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
              <Link
                to="/leaderboard"
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="bg-gradient-to-br from-azure-500 to-blue-violet-500 p-2.5 rounded-lg shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Leaderboard
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    See student rankings
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </Link>
              <Link
                to="/help"
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="bg-gradient-to-br from-azure-500 to-blue-violet-500 p-2.5 rounded-lg shrink-0">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Get Help
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect with a UniVybe guide on WhatsApp
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </Link>
            </div>

            {/* Recent Activity */}
            {(() => {
              const activities =
                dashboardData?.recent_activity || profile.recent_activity || [];
              if (activities.length === 0) return null;

              return (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Recent Activity
                  </h2>
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      // Dashboard activity has different structure
                      if (
                        "action_type" in activity ||
                        "xp_change" in activity
                      ) {
                        const dashActivity = activity as {
                          id: number;
                          action_type: string;
                          xp_change: number;
                          reason: string;
                          created_at: string;
                          course?: { id: number; title: string } | null;
                        };
                        return (
                          <div
                            key={dashActivity.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {dashActivity.action_type?.includes("lesson") && (
                                <BookOpen className="w-5 h-5 text-azure-500" />
                              )}
                              {dashActivity.action_type?.includes("quiz") && (
                                <TrendingUp className="w-5 h-5 text-green-500" />
                              )}
                              {dashActivity.action_type?.includes("course") && (
                                <GraduationCap className="w-5 h-5 text-blue-violet-500" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {dashActivity.reason ||
                                    dashActivity.action_type}
                                </p>
                                {dashActivity.course && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {dashActivity.course.title}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatRelativeTime(
                                    new Date(dashActivity.created_at)
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-bold ${
                                  dashActivity.xp_change >= 0
                                    ? "text-amber-500"
                                    : "text-rose-500"
                                }`}
                              >
                                {dashActivity.xp_change >= 0 ? "+" : ""}
                                {dashActivity.xp_change} XP
                              </p>
                            </div>
                          </div>
                        );
                      }
                      // Profile activity structure
                      const profileActivity = activity as {
                        id: number;
                        type: "lesson" | "quiz" | "course";
                        title: string;
                        xp_earned: number;
                        completed_at: string;
                      };
                      return (
                        <div
                          key={profileActivity.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {profileActivity.type === "lesson" && (
                              <BookOpen className="w-5 h-5 text-azure-500" />
                            )}
                            {profileActivity.type === "quiz" && (
                              <TrendingUp className="w-5 h-5 text-green-500" />
                            )}
                            {profileActivity.type === "course" && (
                              <GraduationCap className="w-5 h-5 text-blue-violet-500" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {profileActivity.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatRelativeTime(
                                  new Date(profileActivity.completed_at)
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-amber-500">
                              +{profileActivity.xp_earned} XP
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === "badges" && (
          <div className="space-y-6">
            {/* Badges Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              {(() => {
                const earnedBadges = (gamificationData?.badges || []).filter(
                  (entry) => entry.has_badge
                );
                return (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                      Earned Badges ({earnedBadges.length})
                    </h2>
                    {earnedBadges.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {earnedBadges.map((entry) => (
                          <div
                            key={entry.badge.id}
                            className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title={entry.badge.description}
                          >
                            {entry.badge.icon_url ? (
                              <img
                                src={entry.badge.icon_url}
                                alt={entry.badge.name}
                                className="w-16 h-16 rounded-full mb-3 object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-linear-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center mb-3">
                                <Award className="w-8 h-8 text-white" />
                              </div>
                            )}
                            <p className="font-semibold text-sm text-gray-900 dark:text-white text-center">
                              {entry.badge.name}
                            </p>
                            {entry.roadmap && (
                              <span className="own-links mt-1">
                                <Link
                                  to={`/roadmaps/${entry.roadmap.slug}`}
                                  className="text-xs font-semibold text-azure-500 underline dark:text-azure-700"
                                >
                                  View roadmap
                                </Link>
                              </span>
                            )}
                            {entry.awarded_at && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                                {formatRelativeTime(new Date(entry.awarded_at))}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No badges earned yet. Keep learning to earn your
                          first badge!
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Achievements Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Achievements ({achievementsData?.achievements?.length || 0})
              </h2>
              {achievementsData?.achievements &&
              achievementsData.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievementsData.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-4 p-4 rounded-lg border-2 transition-colors bg-amber-50 dark:bg-amber-900/20 border-amber-500"
                    >
                      {achievement.icon_url ? (
                        <img
                          src={achievement.icon_url}
                          alt={achievement.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-linear-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center">
                          <Award className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {achievement.name}
                          </p>
                          <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded">
                            Earned
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {achievement.description}
                        </p>
                        {achievement.type === "roadmap_completion" &&
                          achievement.roadmap && (
                            <span className="own-links">
                              <Link
                                to={`/roadmaps/${achievement.roadmap.slug}`}
                                className="text-xs font-semibold text-azure-500 underline dark:text-azure-700"
                              >
                                View roadmap
                              </Link>
                            </span>
                          )}
                        {achievement.earned_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Earned{" "}
                            {formatRelativeTime(
                              new Date(achievement.earned_at)
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No achievements yet. Complete courses and lessons to unlock
                    achievements!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Profile Information
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Name:
                  </span>
                  <p className="text-gray-900 dark:text-white">
                    {profile.firstname && profile.lastname
                      ? `${profile.firstname} ${profile.lastname}`
                      : profile.full_name || profile.email}
                  </p>
                </div>
                {profile.phone && (
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Phone:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {profile.phone}
                    </p>
                  </div>
                )}
                {profile.bio && (
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Bio:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {profile.bio}
                    </p>
                  </div>
                )}
                {profile.university && (
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      University:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {typeof profile.university === "object"
                        ? profile.university.name
                        : profile.university}
                    </p>
                  </div>
                )}
                {profile.faculty && (
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Faculty:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {typeof profile.faculty === "object"
                        ? profile.faculty.name
                        : profile.faculty}
                    </p>
                  </div>
                )}
                {profile.department && (
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Department:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {typeof profile.department === "object"
                        ? profile.department.name
                        : profile.department}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                App Settings
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-gray-900 dark:text-white">
                      Dark Mode
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <button
                    onClick={handleDarkModeToggle}
                    className="w-14 h-7 rounded-full transition-colors relative bg-gray-300 dark:bg-gray-600"
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                        darkMode ? "translate-x-7" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-gray-900 dark:text-white">
                      Low Bandwidth Mode
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Optimize for slower connections
                    </p>
                  </div>
                  <button
                    onClick={handleLowBandwidthToggle}
                    className="w-14 h-7 rounded-full transition-colors relative bg-gray-300 dark:bg-gray-600"
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                        lowBandwidthMode ? "translate-x-7" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Motivation Preferences
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Pick the tone of the celebration message you see after each
                lesson. We will default to the casual & friendly voice if no
                style is selected.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Inspiration Tone
                  </label>
                  <select
                    value={preferencesForm.inspo_type}
                    onChange={(e) =>
                      setPreferencesForm({
                        inspo_type: e.target.value as InspoType,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                  >
                    {INSPIRATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {selectedInspirationOption?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {selectedInspirationOption.description}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-sm italic text-gray-700 dark:text-gray-300">
                  "{preferencePreview}"
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={handlePreferencesSave}
                    disabled={
                      updatePreferencesMutation.isPending || !preferencesChanged
                    }
                    className="inline-flex items-center justify-center px-6 py-3 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                  >
                    {updatePreferencesMutation.isPending
                      ? "Saving..."
                      : "Save Preference"}
                  </button>
                  {updatePreferencesMutation.isSuccess &&
                    !preferencesChanged && (
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Preference saved!
                      </span>
                    )}
                </div>

                {preferenceErrorMessage && (
                  <p className="text-sm text-rose-600 dark:text-rose-400">
                    {preferenceErrorMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Account Actions
              </h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-semibold transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Profile
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.firstname || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            firstname: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.lastname || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            lastname: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={editFormData.phone || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="+232 76 123 4567"
                        maxLength={50}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={editFormData.date_of_birth || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              date_of_birth: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Gender
                      </label>
                      <select
                        value={editFormData.gender || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            gender: e.target.value as
                              | "male"
                              | "female"
                              | "other"
                              | undefined,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={editFormData.bio || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          bio: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      placeholder="Tell us about yourself..."
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {(editFormData.bio || "").length} / 1000 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interests
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddInterest();
                          }
                        }}
                        placeholder="Add an interest"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={50}
                      />
                      <button
                        type="button"
                        onClick={handleAddInterest}
                        disabled={
                          !interestInput.trim() ||
                          (editFormData.interests?.length || 0) >= 10
                        }
                        className="px-4 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editFormData.interests?.map((interest, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300 rounded-full text-sm"
                        >
                          {interest}
                          <button
                            type="button"
                            onClick={() => handleRemoveInterest(index)}
                            className="hover:text-azure-900 dark:hover:text-azure-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {editFormData.interests?.length || 0} / 10 interests
                    </p>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Academic Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      University
                    </label>
                    <select
                      value={editFormData.university_id || ""}
                      onChange={(e) => {
                        const universityId = e.target.value
                          ? parseInt(e.target.value)
                          : undefined;
                        setEditFormData({
                          ...editFormData,
                          university_id: universityId,
                          faculty_id: undefined,
                          department_id: undefined,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                    >
                      <option value="">Select university</option>
                      {universities.map((uni) => (
                        <option key={uni.id} value={uni.id}>
                          {uni.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editFormData.university_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Faculty
                      </label>
                      <select
                        value={editFormData.faculty_id || ""}
                        onChange={(e) => {
                          const facultyId = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          setEditFormData({
                            ...editFormData,
                            faculty_id: facultyId,
                            department_id: undefined,
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      >
                        <option value="">Select faculty</option>
                        {faculties.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editFormData.faculty_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department
                      </label>
                      <select
                        value={editFormData.department_id || ""}
                        onChange={(e) => {
                          const departmentId = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          setEditFormData({
                            ...editFormData,
                            department_id: departmentId,
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.student_id || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            student_id: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Year of Study
                      </label>
                      <input
                        type="number"
                        value={editFormData.year_of_study || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            year_of_study: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        min={1}
                        max={10}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Social Links
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      LinkedIn
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.linkedin || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              linkedin: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Twitter
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.twitter || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              twitter: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://twitter.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GitHub
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.github || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              github: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Portfolio
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.portfolio || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              portfolio: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Facebook
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.facebook || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              facebook: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://facebook.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Instagram
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.instagram || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              instagram: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://instagram.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TikTok
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.tiktok || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              tiktok: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://tiktok.com/@username"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {updateProfileMutation.error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {updateProfileMutation.error instanceof Error
                        ? updateProfileMutation.error.message
                        : "Failed to update profile. Please try again."}
                    </p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 px-6 py-3 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                  >
                    {updateProfileMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};
