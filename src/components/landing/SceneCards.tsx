import type { ComponentType } from "react";
import {
  BookOpen,
  Bookmark,
  Briefcase,
  Camera,
  Check,
  FileText,
  GraduationCap,
  Palette,
  Presentation,
  Trophy,
  type LucideProps,
} from "lucide-react";
import { LandingImg } from "./LandingImg";
import { pickImage } from "./landingAssets";

// Small, decorative UI "props" for the feature scenes, built from CSS/SVG so
// they stay crisp at any size and cost no image bytes. Always rendered inside
// an aria-hidden scene layer; their text is illustrative, not content.

const BRAND_STRIPE = [
  "bg-azure-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-aquamarine-500",
  "bg-blue-violet-500",
];

const card =
  "rounded-2xl bg-white p-3 text-gray-900 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.3)]";

export const CampusCard = () => (
  <div className={`${card} w-full`}>
    <div className="flex h-2 overflow-hidden rounded-full">
      {BRAND_STRIPE.map((c) => (
        <span key={c} className={`h-full flex-1 ${c}`} />
      ))}
    </div>
    <div className="mt-3 flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500 font-accent text-lg leading-none">
        V
      </span>
      <div className="min-w-0">
        <p className="font-accent text-base leading-none tracking-wider">
          UNIVYBE
        </p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">
          Student pass
        </p>
      </div>
    </div>
    <div className="mt-3 space-y-1.5">
      <span className="block h-1.5 w-3/4 rounded-full bg-gray-200" />
      <span className="block h-1.5 w-1/2 rounded-full bg-gray-200" />
    </div>
  </div>
);

export const LessonCard = () => (
  <div className={`${card} w-full`}>
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-azure-500 text-white">
        <BookOpen className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Module 2 · Lesson 3
        </p>
        <p className="truncate text-sm font-extrabold leading-tight">
          Fractions made easy
        </p>
      </div>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
      <span className="block h-full w-[72%] rounded-full bg-azure-500" />
    </div>
  </div>
);

export const ProgressRing = () => (
  <div className="relative grid aspect-square w-full place-items-center rounded-full bg-white shadow-[0_12px_24px_-8px_rgba(0,0,0,0.3)]">
    <svg viewBox="0 0 40 40" className="h-[78%] w-[78%] -rotate-90">
      <circle cx="20" cy="20" r="15" fill="none" strokeWidth="5" className="stroke-gray-200" />
      <circle
        cx="20"
        cy="20"
        r="15"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="94.25"
        strokeDashoffset="26"
        className="stroke-rose-500"
      />
    </svg>
    <span className="absolute inset-0 grid place-items-center font-accent text-lg leading-none text-gray-900">
      72%
    </span>
  </div>
);

export const ProjectBoard = () => (
  <div className={`${card} w-full`}>
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
      Group project
    </p>
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {[
        ["bg-amber-500", "bg-azure-500"],
        ["bg-rose-500"],
        ["bg-blue-violet-500", "bg-aquamarine-500", "bg-amber-500"],
      ].map((col, i) => (
        <div key={i} className="space-y-1.5 rounded-lg bg-gray-100 p-1.5">
          {col.map((c, j) => (
            <span key={j} className={`block h-5 rounded-md ${c}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

interface IconChipProps {
  icon: ComponentType<LucideProps>;
  /** Tailwind text colour for the glyph. */
  tint: string;
}

export const IconChip = ({ icon: Icon, tint }: IconChipProps) => (
  <span className="grid aspect-square w-full place-items-center rounded-2xl bg-white shadow-[0_12px_24px_-8px_rgba(0,0,0,0.3)]">
    <Icon className={`h-[52%] w-[52%] ${tint}`} strokeWidth={2.4} />
  </span>
);

export const CompletionCard = () => (
  <div className={`${card} w-full`}>
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-aquamarine-500 text-gray-900">
        <Check className="h-5 w-5" strokeWidth={3.5} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold leading-tight">Course complete!</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Vybe Coins earned
        </p>
      </div>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
      <span className="block h-full w-full rounded-full bg-rose-500" />
    </div>
  </div>
);

/** Generated 3D coin when available, otherwise a CSS gold token. */
export const CoinToken = () => {
  const coin = pickImage("coin");
  if (coin) {
    return (
      <LandingImg
        image={coin}
        className="h-auto w-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)]"
      />
    );
  }
  return (
    <span className="grid aspect-square w-full place-items-center rounded-full border-[5px] border-amber-700 bg-gradient-to-br from-amber-700 via-amber-500 to-amber-600 font-accent text-[1.6rem] leading-none text-amber-100 shadow-[0_8px_10px_rgba(0,0,0,0.25)]">
      V
    </span>
  );
};

type ResourceKind = "pdf" | "slides" | "notes";

const resourceKinds: Record<
  ResourceKind,
  { label: string; icon: ComponentType<LucideProps>; badge: string }
> = {
  pdf: { label: "Lecture notes", icon: FileText, badge: "bg-rose-500" },
  slides: { label: "Class slides", icon: Presentation, badge: "bg-amber-500" },
  notes: { label: "Study guide", icon: BookOpen, badge: "bg-azure-500" },
};

export const ResourceCard = ({ kind }: { kind: ResourceKind }) => {
  const { label, icon: Icon, badge } = resourceKinds[kind];
  return (
    <div className={`${card} w-full`}>
      <div className="flex items-center gap-2">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${badge}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <p className="truncate text-sm font-extrabold leading-tight">{label}</p>
      </div>
      <div className="mt-3 space-y-1.5">
        <span className="block h-1.5 w-full rounded-full bg-gray-200" />
        <span className="block h-1.5 w-4/5 rounded-full bg-gray-200" />
        <span className="block h-1.5 w-3/5 rounded-full bg-gray-200" />
      </div>
    </div>
  );
};

type GigKind = "design" | "tutoring" | "photography";

const gigKinds: Record<
  GigKind,
  { label: string; price: string; icon: ComponentType<LucideProps>; badge: string }
> = {
  design: { label: "Logo design", price: "Le 500", icon: Palette, badge: "bg-blue-violet-500 text-white" },
  tutoring: { label: "Maths tutoring", price: "Negotiable", icon: GraduationCap, badge: "bg-azure-500 text-white" },
  photography: { label: "Event photos", price: "Le 300", icon: Camera, badge: "bg-aquamarine-500 text-gray-900" },
};

export const GigCard = ({ kind }: { kind: GigKind }) => {
  const { label, price, icon: Icon, badge } = gigKinds[kind];
  return (
    <div className={`${card} w-full`}>
      <div className="flex items-center gap-2">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${badge}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold leading-tight">{label}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {price}
          </p>
        </div>
      </div>
    </div>
  );
};

export const BookmarkChip = () => (
  <span className="grid aspect-square w-full place-items-center rounded-xl bg-amber-500 shadow-[0_10px_20px_-8px_rgba(0,0,0,0.35)]">
    <Bookmark className="h-[55%] w-[55%] fill-gray-900 text-gray-900" />
  </span>
);

type OpportunityKind = "internship" | "scholarship" | "competition";

const opportunityKinds: Record<
  OpportunityKind,
  { label: string; icon: ComponentType<LucideProps>; badge: string }
> = {
  internship: { label: "Internship", icon: Briefcase, badge: "bg-aquamarine-500 text-gray-900" },
  scholarship: { label: "Scholarship", icon: GraduationCap, badge: "bg-amber-500 text-gray-900" },
  competition: { label: "Competition", icon: Trophy, badge: "bg-rose-500 text-white" },
};

export const OpportunityCard = ({ kind }: { kind: OpportunityKind }) => {
  const { label, icon: Icon, badge } = opportunityKinds[kind];
  return (
    <div className={`${card} w-full`}>
      <div className="flex items-center gap-2">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${badge}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold leading-tight">{label}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Open now
          </p>
        </div>
      </div>
    </div>
  );
};
