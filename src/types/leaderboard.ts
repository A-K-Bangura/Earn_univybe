// GET /student/leaderboard, /student/leaderboard/{university,faculty,department,organization,course} raw entry
export interface ScopedLeaderboardApiEntry {
  rank: number;
  student: {
    id: number;
    name: string;
    avatar_url?: string;
    university?: string;
    faculty?: string;
    department?: string;
  };
  xp_total: number;
  period: string;
}

// Transformed Entry Structure (for component use)
export interface LeaderboardEntry {
  rank: number;
  student_id: number;
  student_name: string;
  student_avatar?: string;
  xp_total: number;
  badges_count: number;
  streak_days?: number;
  university?: string;
  faculty?: string;
  department?: string;
}

export interface LeaderboardUserPosition {
  rank: number;
  xp_total: number;
  percentile: number;
}

export interface LeaderboardStats {
  total_students: number;
  total_xp: string;
  average_xp: number;
  top_student: {
    name: string;
    xp: number;
  };
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  user_position?: LeaderboardUserPosition;
  total_users: number;
  stats?: LeaderboardStats;
  period?: string;
}

export interface UniversityLeaderboard {
  leaderboard: LeaderboardEntry[];
  user_position?: LeaderboardUserPosition;
  total_users: number;
  stats?: LeaderboardStats;
  period?: string;
  university: {
    id: number;
    name: string;
  };
}

export interface FacultyLeaderboard {
  leaderboard: LeaderboardEntry[];
  user_position?: LeaderboardUserPosition;
  total_users: number;
  stats?: LeaderboardStats;
  period?: string;
  faculty: {
    id: number;
    name: string;
  };
}

export interface DepartmentLeaderboard {
  leaderboard: LeaderboardEntry[];
  user_position?: LeaderboardUserPosition;
  total_users: number;
  stats?: LeaderboardStats;
  period?: string;
  department: {
    id: number;
    name: string;
  };
}

export interface OrganizationLeaderboard {
  leaderboard: LeaderboardEntry[];
  user_position?: LeaderboardUserPosition;
  total_users: number;
  stats?: LeaderboardStats;
  period?: string;
  organization: {
    id: number;
    name: string;
  };
}

// Legacy types for backward compatibility
export interface LeaderboardFilters {
  type?: "overall" | "weekly" | "monthly" | "university";
  search?: string;
  page?: number;
  per_page?: number;
}
