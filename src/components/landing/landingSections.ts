import type { FeatureAnimationVariant } from "../../hooks/useFeatureSectionAnimation";

// Existing application routes the landing page links to.
export const SIGNUP_ROUTE = "/auth/signup";
export const LOGIN_ROUTE = "/auth/login";
export const COURSES_ROUTE = "/courses";

// The product has no practical-sessions page yet (App.tsx has no such
// route). That CTA keeps its designed label but sends guests to sign-up —
// the app's existing guest strategy for account-gated features (see
// utils/guestGuard.ts) — instead of a dead link. Point it at the real route
// once that page exists.
export const PRACTICAL_SESSIONS_ROUTE = SIGNUP_ROUTE;
// Resources (Round 7, 2026-10-06) and Opportunities/Gigs (Rounds 8-9,
// 2026-10-09) are real, public, guest-browsable routes — their CTAs go
// straight there, not through sign-up.
export const RESOURCES_ROUTE = "/resources";
export const OPPORTUNITIES_ROUTE = "/feed/opportunities";
export const GIGS_ROUTE = "/feed/gigs";

export type FeatureSectionId =
  | "concept"
  | "learning"
  | "practical"
  | "coins"
  | "resources"
  | "opportunities"
  | "gigs";

export interface FeatureSectionConfig {
  id: FeatureSectionId;
  eyebrow?: string;
  title: string;
  description: string;
  /** Literal Tailwind class so the scanner picks it up. */
  background: string;
  /** `light` = white text (blue/pink/purple); `dark` = dark text (yellow/teal). */
  tone: "light" | "dark";
  cta: { label: string; href: string };
  visualSide: "left" | "right";
  animationVariant: FeatureAnimationVariant;
}

// Order follows the page story:
// identity -> learning -> doing -> earning -> resources -> opportunities -> gigs.
export const featureSections: FeatureSectionConfig[] = [
  {
    id: "concept",
    title: "One platform. Every student. Every university.",
    description:
      "UniVybe is built to support students across universities with a fresh, engaging way to learn, stay motivated, discover useful resources, and grow through campus life.",
    background: "bg-amber-500",
    tone: "dark",
    cta: { label: "Get started", href: SIGNUP_ROUTE },
    visualSide: "right",
    animationVariant: "concept",
  },
  {
    id: "learning",
    title: "Bite-sized learning that keeps you moving",
    description:
      "Learn through structured courses broken into focused modules, lessons, and interactive activities designed to make complex topics easier to understand and easier to keep up with.",
    background: "bg-azure-500",
    tone: "light",
    cta: { label: "Explore courses", href: COURSES_ROUTE },
    visualSide: "left",
    animationVariant: "learning",
  },
  {
    id: "practical",
    eyebrow: "Learning shouldn't stop at the screen.",
    title: "Physical meetups, practical sessions",
    description:
      "Turn what you learn into something you can actually do. UniVibe supports physical classes, student-led sessions, and practical meetups where learners can practice concepts, build projects, solve problems, and learn together.",
    background: "bg-aquamarine-500",
    tone: "dark",
    cta: { label: "Discover practical sessions", href: PRACTICAL_SESSIONS_ROUTE },
    visualSide: "right",
    animationVariant: "practical",
  },
  {
    id: "coins",
    eyebrow: "Vybe Coins",
    title: "Learn. Complete. Earn.",
    description:
      "Complete the courses you enroll in and earn Vybe Coins along the way. Your coins represent real value and can be exchanged for monetary rewards — turning consistent learning into something that rewards both your knowledge and your effort.",
    background: "bg-rose-500",
    tone: "light",
    cta: { label: "Get started", href: SIGNUP_ROUTE },
    visualSide: "left",
    animationVariant: "coins",
  },
  {
    id: "resources",
    title: "All the resources you need, easily accessible",
    description:
      "Find lecture notes, slides, past questions, books, study materials, and other useful academic resources in one organized place — so you spend less time searching and more time learning.",
    background: "bg-blue-violet-500",
    tone: "light",
    cta: { label: "Browse resources", href: RESOURCES_ROUTE },
    visualSide: "left",
    animationVariant: "resources",
  },
  {
    id: "opportunities",
    title: "Discover opportunities beyond the classroom",
    description:
      "Explore internships, scholarships, competitions, programs, and other student opportunities that can help you grow, gain experience, and make more of your university journey.",
    background: "bg-azure-500",
    tone: "light",
    cta: { label: "Explore opportunities", href: OPPORTUNITIES_ROUTE },
    visualSide: "right",
    animationVariant: "opportunities",
  },
  {
    id: "gigs",
    eyebrow: "Gigs",
    title: "Pick up gigs, earn on your own schedule",
    description:
      "Find small jobs posted by fellow students, tutors, and the platform — logo design, tutoring, event photography, and more. Earn money, build experience, or post a gig of your own.",
    background: "bg-aquamarine-500",
    tone: "dark",
    cta: { label: "Find gigs", href: GIGS_ROUTE },
    visualSide: "left",
    animationVariant: "gigs",
  },
];
