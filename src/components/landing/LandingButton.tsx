import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type Variant = "solid-dark" | "solid-light" | "outline-dark";
type Size = "sm" | "md" | "lg";

// Each variant restates its hover text colour: index.css sets a global
// `a:hover { color }` that would otherwise win over the base text class.
const variants: Record<Variant, string> = {
  "solid-dark":
    "bg-gray-900 text-white hover:text-white shadow-[0_5px_0_0_rgba(0,0,0,0.28)] focus-visible:outline-gray-900",
  "solid-light":
    "bg-white text-gray-900 hover:text-gray-900 shadow-[0_5px_0_0_rgba(0,0,0,0.25)] focus-visible:outline-white",
  "outline-dark":
    "border-2 border-gray-900 bg-white/60 text-gray-900 hover:bg-white hover:text-gray-900 focus-visible:outline-gray-900",
};

const sizes: Record<Size, string> = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-7 py-3.5 text-base",
  lg: "px-7 py-3.5 text-base sm:px-9 sm:py-4 sm:text-lg",
};

interface LandingButtonProps {
  to: string;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

export const LandingButton = ({
  to,
  variant = "solid-dark",
  size = "md",
  arrow = false,
  className = "",
  children,
}: LandingButtonProps) => (
  <Link
    to={to}
    className={`group inline-flex items-center justify-center gap-2 rounded-full font-extrabold tracking-wide transition-[translate,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-4 ${variants[variant]} ${sizes[size]} ${className}`}
  >
    {children}
    {arrow && (
      <ArrowRight
        aria-hidden
        className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
      />
    )}
  </Link>
);
