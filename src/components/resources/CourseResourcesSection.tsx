import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCourseResources, getResourceVocabulary } from "../../services/resources";
import { useResourceAccess } from "../../hooks/useResourceAccess";
import { isAuthenticated } from "../../services/auth";
import { resolveFormatLabel } from "../../utils/resourceFormat";
import { ResourceListItem } from "./ResourceListItem";
import { ResourceAccessDialog } from "./ResourceAccessDialog";
import { EmptyState } from "../common/EmptyState";

/**
 * A course's attached resources, in the creator's order — same allowance,
 * same access controller as the library. Appended as its own section after
 * "Course Structure" on CourseDetail.tsx (no tabs on that page). See the
 * design guide §8.
 */
export const CourseResourcesSection = ({
  courseId,
}: {
  courseId: string | number;
}) => {
  const navigate = useNavigate();
  const signedIn = isAuthenticated();

  const { data, isLoading } = useQuery({
    queryKey: ["resources", "course", courseId, signedIn],
    queryFn: () => getCourseResources(courseId),
    enabled: !!courseId,
  });

  const { data: vocab } = useQuery({
    queryKey: ["resource-vocabulary"],
    queryFn: getResourceVocabulary,
    staleTime: 60 * 60 * 1000,
  });

  const { open, isAccessing, accessingResourceId, limitDetails, closeLimitDialog } =
    useResourceAccess();

  const resources = data?.resources ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Resources
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Course resources use your normal resource access allowance.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700"
            />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          title="No resources yet"
          description="No resources have been attached to this course yet."
        />
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <ResourceListItem
              key={resource.id}
              resource={resource}
              formatLabel={resolveFormatLabel(resource, vocab)}
              isAccessing={isAccessing && accessingResourceId === resource.id}
              onOpen={(disposition) => open(resource, navigate, disposition)}
            />
          ))}
        </div>
      )}

      <ResourceAccessDialog details={limitDetails} onClose={closeLimitDialog} />
    </div>
  );
};
