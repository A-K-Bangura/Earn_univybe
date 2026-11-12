import { ArrowLeft, ArrowRight } from "lucide-react";

interface RoadmapStageNavigationProps {
  page: number;
  lastPage: number;
  accent: string;
  ink: string;
  onChange: (page: number) => void;
}

/**
 * Journey-flavoured paging for long roadmaps: "stages", not table pages. Renders
 * nothing when the whole roadmap fits on one stage.
 */
export const RoadmapStageNavigation = ({
  page,
  lastPage,
  accent,
  ink,
  onChange,
}: RoadmapStageNavigationProps) => {
  if (lastPage <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < lastPage;
  const nextIsFinal = page + 1 === lastPage;

  return (
    <nav
      aria-label="Roadmap stages"
      className="mx-auto mt-8 flex max-w-xl items-center justify-between gap-3"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={!hasPrev}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Earlier courses</span>
        <span className="sm:hidden">Earlier</span>
      </button>

      <div className="flex min-w-0 flex-col items-center gap-2">
        <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">
          Stage {page} of {lastPage}
        </p>
        {lastPage <= 8 && (
          <ol className="hidden items-center gap-1.5 sm:flex">
            {Array.from({ length: lastPage }, (_, i) => i + 1).map((stage) => (
              <li key={stage}>
                <button
                  type="button"
                  onClick={() => onChange(stage)}
                  aria-label={`Go to stage ${stage}`}
                  aria-current={stage === page ? "step" : undefined}
                  className="grid h-5 w-5 place-items-center rounded-full bg-transparent p-0"
                >
                  <span
                    className="block rounded-full transition-all"
                    style={{
                      width: stage === page ? 12 : 8,
                      height: stage === page ? 12 : 8,
                      backgroundColor:
                        stage === page ? accent : "rgba(255,255,255,0.3)",
                    }}
                  />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={!hasNext}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:brightness-100"
        style={{ backgroundColor: accent, color: ink }}
      >
        <span className="hidden sm:inline">
          {!hasNext ? "Journey's end" : nextIsFinal ? "Final stage" : "Continue journey"}
        </span>
        <span className="sm:hidden">
          {!hasNext ? "The end" : nextIsFinal ? "Final" : "Next"}
        </span>
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
};
