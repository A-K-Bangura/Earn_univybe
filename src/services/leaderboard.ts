import api from "./api";
import type { ApiResponse } from "../types";
import type {
  LeaderboardData,
  UniversityLeaderboard,
  FacultyLeaderboard,
  DepartmentLeaderboard,
  OrganizationLeaderboard,
  ScopedLeaderboardApiEntry,
} from "../types/leaderboard";

interface ScopedLeaderboardResponse {
  leaderboard: ScopedLeaderboardApiEntry[];
  stats?: {
    total_students: number;
    total_xp: string;
    average_xp: number;
    top_student: {
      name: string;
      xp: number;
    };
  };
  period?: string;
}

// Get overall leaderboard
export const getLeaderboard = async (
  limit: number = 50
): Promise<LeaderboardData> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<ScopedLeaderboardResponse>>(
    `/student/leaderboard?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch leaderboard");
  }

  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0, // Not provided in API response
    streak_days: 0, // Not provided in API response
    university: entry.student.university,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
  };
};

// Get university leaderboard
export const getUniversityLeaderboard = async (
  universityId: number,
  limit: number = 50
): Promise<UniversityLeaderboard> => {
  const params = new URLSearchParams();
  params.append("university_id", universityId.toString());
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<ScopedLeaderboardResponse>>(
    `/student/leaderboard/university?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch university leaderboard"
    );
  }

  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
    faculty: entry.student.faculty,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
    university: {
      id: universityId,
      name: "",
    },
  };
};

// Get faculty leaderboard
export const getFacultyLeaderboard = async (
  facultyId: number,
  limit: number = 50
): Promise<FacultyLeaderboard> => {
  const params = new URLSearchParams();
  params.append("faculty_id", facultyId.toString());
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<ScopedLeaderboardResponse>>(
    `/student/leaderboard/faculty?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch faculty leaderboard"
    );
  }

  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
    department: entry.student.department,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
    faculty: {
      id: facultyId,
      name: "",
    },
  };
};

// Get department leaderboard
export const getDepartmentLeaderboard = async (
  departmentId: number,
  limit: number = 50
): Promise<DepartmentLeaderboard> => {
  const params = new URLSearchParams();
  params.append("department_id", departmentId.toString());
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<ScopedLeaderboardResponse>>(
    `/student/leaderboard/department?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch department leaderboard"
    );
  }

  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
    department: {
      id: departmentId,
      name: "",
    },
  };
};

// Get organization leaderboard — mirrors university/faculty/department, for
// UnderGrad/graduate students who are affiliated via organization_id instead
export const getOrganizationLeaderboard = async (
  organizationId: number,
  limit: number = 50
): Promise<OrganizationLeaderboard> => {
  const params = new URLSearchParams();
  params.append("organization_id", organizationId.toString());
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<ScopedLeaderboardResponse>>(
    `/student/leaderboard/organization?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch organization leaderboard"
    );
  }

  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
    organization: {
      id: organizationId,
      name: "",
    },
  };
};

// NOTE: GET /student/leaderboard/achievements was removed by the backend
// (now a plain 404). Use `getAchievements` from services/gamification.ts
// instead — it returns the student's own earned badges, not a leaderboard.
