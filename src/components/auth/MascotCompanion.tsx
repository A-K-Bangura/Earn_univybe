import { LandingImg } from "../landing/LandingImg";
import { pickImage } from "../landing/landingAssets";
import { Mascot, type MascotPose } from "../common/Mascot";

interface MascotCompanionProps {
  pose: MascotPose;
  /** What Vybe "says" — short, specific to the screen the student is on. */
  message: string;
  className?: string;
}

const Bubble = ({
  children,
  tail,
  className = "",
}: {
  children: string;
  tail: "left" | "bottom";
  className?: string;
}) => (
  <p
    className={`rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-snug text-gray-800 shadow-md dark:bg-gray-800 dark:text-gray-100 ${className}`}
  >
    {children}
    <span
      aria-hidden
      className={`absolute h-3 w-3 rotate-45 bg-white dark:bg-gray-800 ${
        tail === "left"
          ? "-left-1.5 top-1/2 -translate-y-1/2"
          : "-bottom-1.5 left-10"
      }`}
    />
  </p>
);

/**
 * Compact mascot + speech bubble for narrow screens (below `lg`), where it sits
 * above the heading. Pairs with <MascotStage>, which takes over at `lg`.
 */
export const MascotInline = ({ pose, message, className = "" }: MascotCompanionProps) => (
  <div
    className={`mb-5 flex items-center justify-center gap-3 lg:hidden ${className}`}
  >
    <Mascot pose={pose} priority className="vybe-float h-28 w-auto shrink-0 sm:h-32" />
    <Bubble tail="left" className="relative max-w-[15rem]">
      {message}
    </Bubble>
  </div>
);

/**
 * Large mascot stage for `lg+` screens: Vybe on a soft brand-coloured panel
 * beside the form, with a speech bubble and a couple of floating accents.
 */
export const MascotStage = ({ pose, message, className = "" }: MascotCompanionProps) => (
  <div
    className={`relative hidden min-h-[30rem] items-end justify-center overflow-hidden rounded-3xl bg-linear-to-br from-azure-900 via-white to-blue-violet-900 px-6 pt-24 shadow-sm ring-1 ring-black/5 dark:from-azure-100 dark:via-gray-900 dark:to-blue-violet-100 dark:ring-white/10 lg:flex ${className}`}
  >
    {/* soft brand blobs */}
    <span
      aria-hidden
      className="pointer-events-none absolute -left-12 bottom-10 h-48 w-48 rounded-full bg-aquamarine-500/25 blur-2xl"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute -right-10 top-24 h-44 w-44 rounded-full bg-rose-500/20 blur-2xl"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/3 top-1/3 h-40 w-40 rounded-full bg-amber-500/25 blur-3xl"
    />

    <Bubble tail="bottom" className="absolute left-6 top-6 z-20 max-w-[16rem]">
      {message}
    </Bubble>

    <LandingImg
      image={pickImage("float-spark")}
      className="vybe-float pointer-events-none absolute right-10 top-12 h-16 w-auto"
    />
    <LandingImg
      image={pickImage("float-cap")}
      className="vybe-float pointer-events-none absolute right-8 bottom-10 h-12 w-auto rotate-12"
    />

    <Mascot
      pose={pose}
      priority
      className="relative z-10 h-[26rem] max-h-[60vh] w-auto max-w-full object-contain drop-shadow-xl"
    />
  </div>
);
