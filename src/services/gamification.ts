import api from "./api";
import type { ApiResponse } from "../types";
import type {
  GamificationDashboard,
  BadgeList,
  StreakData,
  GamificationLeaderboard,
  LeaderboardPosition,
  XPHistory,
  AchievementList,
  CheckBadgesResponse,
  GamificationStats,
} from "../types/gamification";

// Get gamification dashboard
export const getGamificationDashboard =
  async (): Promise<GamificationDashboard> => {
    const response = await api.get<ApiResponse<GamificationDashboard>>(
      "/student/gamification/dashboard"
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || "Failed to fetch gamification dashboard"
      );
    }

    return response.data.data;
  };

// Get badges (entire catalog: earned + unearned)
export const getBadges = async (): Promise<BadgeList> => {
  const response = await api.get<ApiResponse<{ badges: BadgeList }>>(
    "/student/gamification/badges"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch badges");
  }

  return response.data.data.badges;
};

// Get streaks
export const getStreaks = async (): Promise<StreakData> => {
  const response = await api.get<ApiResponse<StreakData>>(
    "/student/gamification/streaks"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch streaks");
  }

  return response.data.data;
};

// Get leaderboards
export const getGamificationLeaderboards = async (
  type: "global" | "university" | "course" = "global",
  options?: { university_id?: number; period?: "all" | "week" | "month" | "year"; limit?: number }
): Promise<GamificationLeaderboard> => {
  const params = new URLSearchParams();
  params.append("type", type);
  if (options?.university_id)
    params.append("university_id", options.university_id.toString());
  if (options?.period) params.append("period", options.period);
  if (options?.limit) params.append("limit", options.limit.toString());

  const response = await api.get<ApiResponse<GamificationLeaderboard>>(
    `/student/gamification/leaderboards?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch leaderboards");
  }

  return response.data.data;
};

// Get leaderboard position
export const getLeaderboardPosition = async (
  type: "global" | "university" | "faculty" | "department" | "organization" = "global",
  scopeId?: number
): Promise<LeaderboardPosition> => {
  const params = new URLSearchParams();
  params.append("type", type);
  if (scopeId !== undefined) params.append("scope_id", scopeId.toString());

  const response = await api.get<ApiResponse<{ position: LeaderboardPosition }>>(
    `/student/gamification/position?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch leaderboard position"
    );
  }

  return response.data.data.position;
};

// Get XP history
export const getXPHistory = async (limit?: number): Promise<XPHistory["xp_history"]> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<XPHistory>>(
    `/student/gamification/xp-history?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch XP history");
  }

  return response.data.data.xp_history;
};

// Get achievements (the student's own recently-earned badges)
export const getAchievements = async (
  limit?: number
): Promise<AchievementList> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<AchievementList>>(
    `/student/gamification/achievements?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch achievements"
    );
  }

  return response.data.data;
};

// Check badges
export const checkBadges = async (): Promise<CheckBadgesResponse> => {
  const response = await api.post<ApiResponse<CheckBadgesResponse>>(
    "/student/gamification/check-badges",
    {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to check badges");
  }

  return response.data.data;
};

// Get gamification stats
export const getGamificationStats = async (): Promise<GamificationStats> => {
  const response = await api.get<ApiResponse<GamificationStats>>(
    "/student/gamification/stats"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch gamification stats"
    );
  }

  return response.data.data;
};
