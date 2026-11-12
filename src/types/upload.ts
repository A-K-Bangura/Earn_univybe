// Upload presign response types
export interface UploadPresignRequest {
  purpose: "avatar" | "credential" | "lesson_media" | "feed_media" | "thumbnail" | "document";
  file_type: string;
  file_size: number;
}

export interface UploadPresignResponse {
  signature: string;
  timestamp: number;
  cloud_name: string;
  api_key: string;
  folder: string;
  upload_url: string;
}

// Cloudinary upload response types
export interface CloudinaryUploadResponse {
  asset_id: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  url: string;
  secure_url: string;
}

// Store metadata request types
export interface StoreMetadataRequest {
  cloudinary_data: CloudinaryUploadResponse;
  purpose: "avatar" | "credential" | "lesson_media" | "feed_media" | "thumbnail" | "document";
  entity_type?: string;
  entity_id?: number;
}

export interface FileUpload {
  id: number;
  uuid: string;
  upload_purpose: string;
  cloudinary_secure_url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  entity_type?: string;
  entity_id?: number;
}

export interface StoreMetadataResponse {
  file_upload: FileUpload;
}

