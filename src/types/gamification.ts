import type { RoadmapLink } from "./roadmap";

// XP Stats
export interface XPStats {
  total_xp: number;
  xp_by_action?: Record<string, string>;
  recent_xp?: number;
  /** XP-tier gamification level — only present on the Gamification Dashboard's xp_stats */
  score_level?: number;
  // Legacy fields for backward compatibility
  total?: number;
  level?: number;
  xp_to_next_level?: number;
  this_week?: number;
  this_month?: number;
}

// Streak Stats
export interface StreakStats {
  current_streak: number;
  longest_streak: number;
  active_days?: number;
  average_activity?: number;
  streak_history?: Array<{
    date: string;
    active: boolean;
  }>;
  // Legacy fields for backward compatibility
  next_milestone?: number;
}

// Badge catalog entry (earned + unearned), as returned by Get Gamification Dashboard / Get Badges
export interface Badge {
  badge: {
    id: number;
    name: string;
    description?: string;
    icon_url: string | null;
    category?: string;
    rarity: string;
  };
  has_badge: boolean;
  /**
   * A number (0-100) for ordinary badges. Earned roadmap badges carry an object
   * instead (`{ current, target, percentage, is_completed }`), so don't assume a number.
   */
  progress: number | BadgeProgressObject;
  awarded_at: string | null;
  /** Present only on earned roadmap-completion badges (Round 6); absent on ordinary badges. */
  roadmap?: RoadmapLink;
}

export interface BadgeProgressObject {
  current: number;
  target: number;
  percentage: number;
  is_completed: boolean;
}

// Leaderboard Position
export interface LeaderboardPosition {
  rank: number;
  position: number;
  total_students: number;
  percentile: number;
  top_students?: Array<{
    id: number;
    name: string;
    xp_total: number;
    avatar_url?: string;
  }>;
  // Legacy fields for backward compatibility
  overall?: number;
  university?: number;
  faculty?: number;
  department?: number;
}

// Leaderboard Entry (for the legacy /gamification/leaderboards-derived UI shape)
export interface LeaderboardEntry {
  rank: number;
  student_id: number;
  student_name: string;
  xp_total: number;
  badges_count: number;
}

// GET /student/gamification/leaderboards entry
export interface GamificationLeaderboardEntry {
  rank: number;
  student: {
    id: number;
    firstname: string;
    lastname: string;
    avatar_url?: string | null;
  };
  xp_total: number;
}

// GET /student/gamification/leaderboards response (data)
export interface GamificationLeaderboard {
  leaderboard: GamificationLeaderboardEntry[];
  stats: {
    total_students: number;
    total_xp: number;
    average_xp: number;
    top_student: { id: number; name: string } | null;
  };
  period: "all" | "week" | "month" | "year";
  type: "global" | "university" | "course";
}

// Personal achievement / recently-earned badge — shared shape used by
// Gamification Dashboard's recent_achievements and Get Achievements
export interface PersonalAchievement {
  id: number;
  name: string;
  description: string;
  icon_url: string | null;
  category: string;
  rarity: string;
  earned_at: string;
  /** Round 6: `roadmap_completion` for finishing a roadmap, otherwise `badge`. */
  type?: "badge" | "roadmap_completion";
  /** `null` unless `type` is `roadmap_completion`. */
  roadmap?: RoadmapLink | null;
}

/** @deprecated use PersonalAchievement */
export type RecentAchievement = PersonalAchievement;

// Gamification Dashboard
export interface GamificationDashboard {
  xp_stats: XPStats;
  streak_stats: StreakStats;
  badges: Badge[];
  leaderboard_position: LeaderboardPosition;
  /** The student's own recently-earned badges (not a global feed) */
  recent_achievements: PersonalAchievement[];
}

// Badge List — the entire badge catalog (earned + unearned); no summary counts are returned
export type BadgeList = Badge[];

// Streak milestone buckets, as returned by Get Streaks
export interface StreakMilestone {
  days: number;
  label: string;
}

export interface UpcomingStreakMilestone extends StreakMilestone {
  days_remaining: number;
}

export interface StreakMilestones {
  achieved: StreakMilestone[];
  upcoming: UpcomingStreakMilestone[];
}

// Streak Data — everything is nested under streak_stats/milestones
export interface StreakData {
  streak_stats: StreakStats;
  milestones: StreakMilestones;
}

// XP History Entry
export interface XPHistoryEntry {
  action_type: string;
  xp_change: number;
  reason: string;
  created_at: string;
}

// XP History — response key is `xp_history`, no total/total_awarded/total_deducted
export interface XPHistory {
  xp_history: XPHistoryEntry[];
}

// Achievement List — Get Achievements only ever returns the achievements array
export interface AchievementList {
  achievements: PersonalAchievement[];
}

// Check Badges Response
export interface CheckBadgesResponse {
  awarded_badges: Array<{
    id: number;
    name: string;
    description: string;
    icon_url?: string | null;
  }>;
  count: number;
}

// Gamification Stats
export interface GamificationStats {
  xp_stats: {
    total_xp: number;
    xp_by_action: Record<string, string | number>;
    recent_xp: string | number;
  };
  streak_stats: StreakStats;
  badge_stats: {
    total_badges: number;
    earned_badges: number;
    completion_percentage: number;
  };
}

