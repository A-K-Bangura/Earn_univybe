import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../services/auth";
import {
  getActiveSessionUser,
  hasPendingOnboardingSession,
  isOnboardingComplete,
} from "../../utils/onboardingSession";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAuth = true,
  requireOnboarding = false,
}: ProtectedRouteProps) => {
  const location = useLocation();

  // Check if user is authenticated (has main auth token)
  const authenticated = isAuthenticated();

  // A verified student who hasn't finished onboarding holds only a pending
  // token (see services/auth.ts::verifyOtp).
  const hasPendingToken = hasPendingOnboardingSession();

  // A token isn't proof of a finished profile — judge by the stored user of the
  // session requests are actually made as (see utils/onboardingSession.ts).
  const hasOnboarded = isOnboardingComplete(getActiveSessionUser());

  // The onboarding route also accepts the pending token; every other route
  // needs a full session.
  const isOnboardingRoute = location.pathname === "/onboarding";
  const canAccess = authenticated || (isOnboardingRoute && hasPendingToken);

  if (requireAuth && !canAccess) {
    // A pending student can't use password login (their account has no usable
    // password yet), so send them back to finish onboarding, not to login.
    return <Navigate to={hasPendingToken ? "/onboarding" : "/auth/login"} replace />;
  }

  // If onboarding is required and user hasn't onboarded, redirect to onboarding
  if (requireOnboarding && !hasOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
