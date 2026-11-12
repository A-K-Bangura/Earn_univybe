import api from "./api";
import type { ApiResponse } from "../types";
import type {
  UploadPresignRequest,
  UploadPresignResponse,
  CloudinaryUploadResponse,
  StoreMetadataRequest,
  StoreMetadataResponse,
} from "../types/upload";

/**
 * Step 1: Get upload signature from Laravel
 */
export const getUploadPresign = async (
  request: UploadPresignRequest
): Promise<UploadPresignResponse> => {
  const response = await api.post<ApiResponse<UploadPresignResponse>>(
    "/upload/presign",
    request
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to get upload signature");
  }

  return response.data.data;
};

/**
 * Step 2: Upload file directly to Cloudinary
 * This is a client-side upload to Cloudinary's API
 */
export const uploadToCloudinary = async (
  file: File,
  signatureData: UploadPresignResponse
): Promise<CloudinaryUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", signatureData.signature);
  formData.append("timestamp", signatureData.timestamp.toString());
  formData.append("api_key", signatureData.api_key);
  formData.append("folder", signatureData.folder);

  const response = await fetch(signatureData.upload_url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || "Cloudinary upload failed"
    );
  }

  return await response.json();
};

/**
 * Step 3: Store metadata and update avatar
 */
export const storeUploadMetadata = async (
  request: StoreMetadataRequest
): Promise<StoreMetadataResponse> => {
  const response = await api.post<ApiResponse<StoreMetadataResponse>>(
    "/upload/store-metadata",
    request
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to store metadata");
  }

  return response.data.data;
};

/**
 * Complete avatar upload flow (all 3 steps)
 */
export const uploadAvatar = async (
  file: File
): Promise<StoreMetadataResponse> => {
  // Step 1: Get upload signature
  const signatureData = await getUploadPresign({
    purpose: "avatar",
    file_type: file.type,
    file_size: file.size,
  });

  // Step 2: Upload to Cloudinary
  const cloudinaryResponse = await uploadToCloudinary(file, signatureData);

  // Step 3: Store metadata (omitting entity_type and entity_id for own avatar)
  const metadataResponse = await storeUploadMetadata({
    cloudinary_data: cloudinaryResponse,
    purpose: "avatar",
  });

  return metadataResponse;
};

