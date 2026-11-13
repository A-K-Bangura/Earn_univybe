import type { ReactNode } from 'react';
import { isAuthenticated } from '../../services/auth';
import { hasPendingOnboardingSession } from '../../utils/onboardingSession';
import { ProtectedRoute } from './ProtectedRoute';

export function DiscoverEntry({ guest, children }: { guest: ReactNode; children: ReactNode }) {
  if (!isAuthenticated() && !hasPendingOnboardingSession()) return <>{guest}</>;
  return <ProtectedRoute requireOnboarding>{children}</ProtectedRoute>;
}
