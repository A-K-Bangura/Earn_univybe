import { useQuery } from "@tanstack/react-query";
import { getRoadmaps } from "../../services/roadmaps";
import { isAuthenticated } from "../../services/auth";
import { SectionHeader } from "../discovery/SectionHeader";
import { RoadmapTile, RoadmapTileSkeleton } from "./RoadmapTile";

// Five tiles are fetched; narrower screens show fewer (see the per-index
// classes below): 3 at md, 4 at lg, 5 at xl. Phones get a swipe carousel.
const PREVIEW_COUNT = 5;

const hiddenBelow = (index: number) =>
  index >= 4 ? "hidden xl:block" : index === 3 ? "hidden lg:block" : "";

/**
 * "Learning Roadmaps" strip on the Courses page. Quietly renders nothing when
 * there are no roadmaps yet (or they fail to load) so course discovery never
 * shows an empty or broken section.
 */
export const RoadmapsPreviewSection = () => {
  const signedIn = isAuthenticated();
  const { data, isLoading, isError } = useQuery({
    // Personalised when signed in, so the two never share a cache entry.
    queryKey: ["roadmaps", "preview", signedIn],
    queryFn: () => getRoadmaps({ per_page: PREVIEW_COUNT }),
    staleTime: 60_000,
  });

  const roadmaps = data?.data ?? [];
  if (isError || (!isLoading && roadmaps.length === 0)) return null;

  return (
    <section aria-labelledby="roadmaps-preview-title" className="mb-10">
      <SectionHeader
        id="roadmaps-preview-title"
        title="Learning Roadmaps"
        subtitle="Follow guided learning journeys built from related courses."
        action={{ label: "See all roadmaps", to: "/roadmaps" }}
      />

      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
        {isLoading
          ? Array.from({ length: PREVIEW_COUNT }, (_, i) => (
              <li
                key={i}
                className={`w-[72%] shrink-0 snap-start md:w-auto ${hiddenBelow(i)}`}
              >
                <RoadmapTileSkeleton />
              </li>
            ))
          : roadmaps.map((roadmap, i) => (
              <li
                key={roadmap.id}
                className={`w-[72%] shrink-0 snap-start md:w-auto ${hiddenBelow(i)}`}
              >
                <RoadmapTile roadmap={roadmap} />
              </li>
            ))}
      </ul>
    </section>
  );
};
