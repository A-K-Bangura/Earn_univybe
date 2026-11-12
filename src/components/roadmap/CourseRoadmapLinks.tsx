import { Link } from "react-router-dom";
import { ArrowRight, Route } from "lucide-react";
import type { CourseRoadmapRef } from "../../types/roadmap";
import { CourseCover } from "../course/CourseCover";

/**
 * "Part of the X roadmap, course 3 of 10" cards on Course Details: how a
 * student who found a course on its own discovers the journey it belongs to.
 * Purely informational; a roadmap never locks or reorders the course.
 */
export const CourseRoadmapLinks = ({
  roadmaps,
}: {
  roadmaps: CourseRoadmapRef[] | undefined;
}) => {
  if (!roadmaps || roadmaps.length === 0) return null;

  return (
    <section aria-labelledby="course-roadmaps-title" className="own-links mb-8">
      <h2
        id="course-roadmaps-title"
        className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"
      >
        <Route className="h-5 w-5 text-azure-500" aria-hidden />
        {roadmaps.length === 1 ? "Part of a roadmap" : "Part of these roadmaps"}
      </h2>
      <ul className="space-y-3">
        {roadmaps.map((roadmap) => (
          <li key={roadmap.id}>
            <Link
              to={`/roadmaps/${roadmap.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-gray-700 dark:bg-gray-800"
            >
              <CourseCover
                title={roadmap.title}
                seed={roadmap.slug}
                thumbnailUrl={roadmap.thumbnail_url}
                variant="portrait"
                className="h-16 w-16 shrink-0 rounded-xl"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {roadmap.title}
                </span>
                <span className="block text-sm text-gray-600 dark:text-gray-400">
                  This is course {roadmap.position} of {roadmap.total_courses}.
                  Take them in any order.
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-azure-500 dark:text-azure-700">
                <span className="hidden sm:inline">View journey</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
