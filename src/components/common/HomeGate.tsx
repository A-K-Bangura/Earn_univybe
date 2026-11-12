import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../../services/auth";
import { hasPendingOnboardingSession } from "../../utils/onboardingSession";

/**
 * Decides where "/" (and unknown URLs) go, at render time:
 * signed-in students to the dashboard, verified-but-not-onboarded students back
 * to onboarding (so closing the browser mid-way and reopening the site doesn't
 * strand them on the guest landing page), everyone else sees `guest`.
 */
export const HomeGate = ({ guest }: { guest: ReactNode }) => {
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;
  if (hasPendingOnboardingSession()) return <Navigate to="/onboarding" replace />;
  return <>{guest}</>;
};
