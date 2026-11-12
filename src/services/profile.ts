import api from "./api";
import type { ApiResponse } from "../types";
import type { UserProfile, UpdateProfileData } from "../types/profile";

// Get user profile
export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await api.get<ApiResponse<{ student: UserProfile }>>(
    "/student/profile"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch profile");
  }

  return response.data.data.student;
};

// Update user profile
export const updateProfile = async (
  data: UpdateProfileData
): Promise<{ student: Partial<UserProfile> }> => {
  const response = await api.put<
    ApiResponse<{ student: Partial<UserProfile> }>
  >("/student/profile", data);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to update profile");
  }

  return response.data.data;
};

// Update avatar
export const updateAvatar = async (
  file: File
): Promise<{ student: { avatar_url: string } }> => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.post<
    ApiResponse<{ student: { avatar_url: string } }>
  >("/student/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to update avatar");
  }

  return response.data.data;
};

// View student profile by ID (public profile)
export const getStudentProfile = async (
  studentId: string | number
): Promise<UserProfile> => {
  const response = await api.get<ApiResponse<{ student: UserProfile }>>(
    `/student/students/${studentId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch student profile");
  }

  return response.data.data.student;
};
