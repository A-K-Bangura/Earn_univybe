import { getActiveSessionUser } from './onboardingSession';
export const accountScope = () => String(getActiveSessionUser()?.id ?? 'guest');
