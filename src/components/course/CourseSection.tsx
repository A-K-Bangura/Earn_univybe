import type { Course } from "../../types/dashboard";
import { SectionHeader } from "../discovery/SectionHeader";
import { CourseCard } from "./CourseCard";

const gridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export const CourseGrid = ({
  courses,
  source,
}: {
  courses: Course[];
  /** Analytics/navigation hint passed to every card. */
  source: string;
}) => (
  <div className={gridClass}>
    {courses.map((course) => (
      <CourseCard key={course.id} course={course} source={source} />
    ))}
  </div>
);

export const CourseGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className={gridClass} aria-hidden>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800"
      >
        <div className="h-40 bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2 p-4">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    ))}
  </div>
);

interface CourseSectionProps {
  id: string;
  title: string;
  courses: Course[];
  source: string;
  onSeeAll: () => void;
}

/** A titled row of course cards with a "See all" action (recommendations, explore). */
export const CourseSection = ({
  id,
  title,
  courses,
  source,
  onSeeAll,
}: CourseSectionProps) => (
  <section aria-labelledby={id} className="mb-10">
    <SectionHeader
      id={id}
      title={title}
      action={{ label: "See all", onClick: onSeeAll }}
    />
    <CourseGrid courses={courses} source={source} />
  </section>
);
