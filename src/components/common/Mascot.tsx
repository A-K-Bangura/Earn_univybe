import { LandingImg } from "../landing/LandingImg";
import { pickImage } from "../landing/landingAssets";

// Vybe's poses, by meaning rather than filename. Each lists the optimized
// images (built by scripts/optimize-assets.mjs into src/assets/landing/) to try
// in order, so a pose whose bespoke art isn't there yet falls back to an
// existing one instead of rendering nothing.
const POSES = {
  /** Waving hello: introductions. */
  hi: ["mascot-hi"],
  /** Hands in pockets, relaxed: welcome back. */
  cool: ["mascot-cool", "mascot-hi"],
  /** Graduation cap, arms folded: starting a journey / choosing a level. */
  hat: ["mascot-hat", "mascot-hi"],
  /** Laptop, trophy, streak: the learning experience. */
  learning: ["mascot-learning", "mascot-hat"],
  /** Glasses and a book: working things out. */
  smart: ["mascot-smart", "mascot-hat"],
  /** Shrug: "not sure?" moments. */
  shrug: ["mascot-shrug", "mascot-hi"],
  /** Holding an envelope: check your email / verification code. */
  mail: ["mascot-mail", "mascot-hi"],
  /** Holding a key and shield: passwords and account safety. */
  secure: ["mascot-secure", "mascot-cool"],
  /** Arms up among falling coins. */
  coins: ["mascot-coins", "mascot-hat"],
} as const;

export type MascotPose = keyof typeof POSES;

interface MascotProps {
  pose: MascotPose;
  /** Describe the pose only if it carries meaning; decorative by default. */
  alt?: string;
  className?: string;
  /** Above-the-fold art only; everything else lazy-loads. */
  priority?: boolean;
}

export const Mascot = ({ pose, alt = "", className, priority }: MascotProps) => (
  <LandingImg
    image={pickImage(...POSES[pose])}
    alt={alt}
    className={className}
    priority={priority}
  />
);
