import type { Resource, ResourceVocabulary } from "../types/resource";

/**
 * "pptx" -> "PowerPoint", "youtube_playlist" -> "YouTube Playlist" — looked
 * up from the vocabulary endpoint rather than hard-coded, since an admin can
 * add new formats. Falls back to the raw value (uppercased) while the
 * vocabulary is still loading or for an unrecognized value.
 */
export const resolveFormatLabel = (
  resource: Resource,
  vocab?: ResourceVocabulary
): string => {
  const pool =
    resource.source_type === "file" ? vocab?.file_formats : vocab?.link_types;
  const match = pool?.find((entry) => entry.value === resource.format);
  return match?.label ?? resource.format.toUpperCase();
};
