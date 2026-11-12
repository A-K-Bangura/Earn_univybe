import type { ReactNode } from "react";
import { useUIStore } from "../../store/uiStore";
import { brandIconBlack160, brandIconWhite160 } from "../../assets/brand";
import { GuestHeader } from "../layout/GuestHeader";
import type { MascotPose } from "../common/Mascot";
import { MascotInline, MascotStage } from "./MascotCompanion";

interface AuthLayoutProps {
  /** Vybe's pose: pick one that matches what the student is doing on this screen. */
  pose: MascotPose;
  /** What Vybe says on this screen. */
  message: string;
  children: ReactNode;
}

/**
 * Shared frame for the guest auth screens (sign in, sign up, verify email):
 * the landing-style header, a contextual Vybe, and the form column. On `lg+`
 * Vybe stands on a panel beside the form; below that he sits above it with a
 * speech bubble, and (below `md`, where there is no header) the app icon.
 */
export const AuthLayout = ({ pose, message, children }: AuthLayoutProps) => {
  const darkMode = useUIStore((state) => state.darkMode);
  const icon = darkMode ? brandIconWhite160 : brandIconBlack160;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900 md:pt-24 lg:flex lg:items-center lg:pt-28 lg:pb-12">
      <GuestHeader variant="app" />
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <MascotStage pose={pose} message={message} />
        <div className="mx-auto w-full max-w-md">
          <img
            src={icon.src}
            width={icon.width}
            height={icon.height}
            alt="UniVybe"
            className="mx-auto mb-2 h-12 w-12 md:hidden"
          />
          <MascotInline pose={pose} message={message} />
          {children}
        </div>
      </div>
    </div>
  );
};
