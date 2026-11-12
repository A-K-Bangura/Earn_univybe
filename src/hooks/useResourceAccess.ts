import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";
import type { AxiosError } from "axios";
import { accessResource, getResourceUsage } from "../services/resources";
import { isAuthenticated } from "../services/auth";
import { requireAuthOrRedirect } from "../utils/guestGuard";
import { ApiError } from "../utils/apiError";
import type { ApiResponse } from "../types";
import type {
  Resource,
  ResourceAccessLimitDetails,
  ResourceAccessResult,
} from "../types/resource";

export const RESOURCE_USAGE_QUERY_KEY = ["resource-usage"] as const;

/**
 * The shared "resource access" controller: every surface (library list,
 * resource detail, course resources) funnels Open/Download through this, so
 * the allowance (`usage`) never drifts between surfaces and the 402 paywall
 * always behaves the same way. See docs/designs/
 * univybe_resources_implementation_design_guide.md §6/§11.
 */
export function useResourceAccess() {
  const queryClient = useQueryClient();
  const [limitDetails, setLimitDetails] =
    useState<ResourceAccessLimitDetails | null>(null);

  const usageQuery = useQuery({
    queryKey: RESOURCE_USAGE_QUERY_KEY,
    queryFn: getResourceUsage,
    enabled: isAuthenticated(),
  });

  const accessMutation = useMutation({
    mutationFn: ({
      resource,
      disposition,
    }: {
      resource: Resource;
      disposition?: "inline" | "attachment";
    }) => accessResource(resource.id, disposition),
  });

  const open = async (
    resource: Resource,
    navigate: NavigateFunction,
    disposition?: "inline" | "attachment"
  ): Promise<ResourceAccessResult | undefined> => {
    if (!requireAuthOrRedirect(navigate)) return undefined;

    const opensNewTab =
      disposition === "inline" || resource.source_type === "external";
    // Open the blank tab synchronously, before the await, so the browser
    // never treats the later location.href assignment as a blocked popup.
    const pendingTab = opensNewTab ? window.open("", "_blank") : null;

    try {
      const result = await accessMutation.mutateAsync({ resource, disposition });
      // Replace, not invalidate — this is the authoritative server value and
      // every surface should reflect it immediately.
      queryClient.setQueryData(RESOURCE_USAGE_QUERY_KEY, result.usage);

      if (opensNewTab) {
        if (pendingTab) {
          // Guard against the opened page reaching back into the portal.
          pendingTab.opener = null;
          pendingTab.location.href = result.access.url;
        } else {
          // No handle at all (blocked outright) — same-tab fallback.
          window.location.href = result.access.url;
        }
      } else {
        // attachment: a temporary anchor click triggers the browser's normal
        // download handling (the signed URL's Content-Disposition does the
        // rest) — no SPA navigation, no fetch-to-blob.
        const link = document.createElement("a");
        link.href = result.access.url;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      return result;
    } catch (error) {
      pendingTab?.close();

      if (error && typeof error === "object" && "response" in error) {
        const apiError = ApiError.fromAxiosError(
          error as AxiosError<ApiResponse>
        );
        if (apiError.code === "RESOURCE_ACCESS_LIMIT_REACHED" && apiError.details) {
          const details = apiError.details as unknown as ResourceAccessLimitDetails;
          setLimitDetails(details);
          queryClient.setQueryData(RESOURCE_USAGE_QUERY_KEY, details.usage);
          return undefined;
        }
      }
      // Every other error (storage unavailable, not found, account
      // suspended, ...) is the caller's to show inline.
      throw error;
    }
  };

  return {
    open,
    isAccessing: accessMutation.isPending,
    accessingResourceId: accessMutation.variables?.resource.id,
    usageQuery,
    limitDetails,
    closeLimitDialog: () => setLimitDetails(null),
  };
}
