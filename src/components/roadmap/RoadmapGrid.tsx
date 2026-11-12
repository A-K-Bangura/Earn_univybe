import type { Roadmap } from "../../types/roadmap";
import { RoadmapTile, RoadmapTileSkeleton } from "./RoadmapTile";

interface RoadmapGridProps {
  roadmaps: Roadmap[];
  /** Ids to flag with the "Recommended" badge. */
  recommendedIds?: ReadonlySet<number>;
}

// 2 columns on phones (title stays readable over the poster), widening up.
const gridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";

export const RoadmapGrid = ({ roadmaps, recommendedIds }: RoadmapGridProps) => (
  <ul className={gridClass}>
    {roadmaps.map((roadmap) => (
      <li key={roadmap.id}>
        <RoadmapTile
          roadmap={roadmap}
          recommended={recommendedIds?.has(roadmap.id)}
        />
      </li>
    ))}
  </ul>
);

export const RoadmapGridSkeleton = ({ count = 10 }: { count?: number }) => (
  <ul className={gridClass} aria-hidden>
    {Array.from({ length: count }, (_, i) => (
      <li key={i}>
        <RoadmapTileSkeleton />
      </li>
    ))}
  </ul>
);
