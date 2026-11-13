import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import * as authService from "../services/auth";
import { rememberReturnPath, consumeReturnPath } from '../utils/returnPath';
import { isOnboardingComplete } from "../utils/onboardingSession";

export const useAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // A signed-in account that never finished onboarding goes back to it,
      // not to a dashboard/redirect target its guard would bounce anyway.
      rememberReturnPath(searchParams.get("redirect"));
      if (!isOnboardingComplete(data.user)) {
        navigate("/onboarding");
        return;
      }
      // A guest sent to log in from e.g. a resource detail page (?redirect=
      // /resources/123) returns there instead of the dashboard. Signup has
      // no equivalent — see docs/DECISIONS.md for why that's scoped out.
      navigate(consumeReturnPath());
    },
    onError: (error: Error) => {
      // Don't redirect on error - let the component handle it
      console.error("Login error:", error);
    },
  });

  // Send OTP mutation (used for signup)
  const sendOtpMutation = useMutation({
    mutationFn: authService.sendOtp,
    onSuccess: () => {
      // Redirect to OTP verification
      rememberReturnPath(searchParams.get("redirect"));
      navigate("/auth/verify");
    },
    onError: (error: Error) => {
      console.error("Send OTP error:", error);
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: authService.verifyOtp,
    onSuccess: (data) => {
      // Anyone who hasn't finished onboarding (new signups, or a student
      // coming back after an interruption/expired session) resumes it here;
      // the draft is restored by the page. `requires_onboarding` already
      // folds in the stored-profile check (services/auth.ts::verifyOtp).
      rememberReturnPath(searchParams.get("redirect"));
      if (data.requires_onboarding) {
        navigate("/onboarding");
      } else {
        // For existing users who don't need onboarding, go to dashboard
        navigate(consumeReturnPath());
      }
    },
    onError: (error: Error) => {
      console.error("OTP verification error:", error);
    },
  });

  // Logout
  const logout = async () => {
    await authService.logout();
    navigate("/auth/login");
  };

  return {
    login: loginMutation.mutateAsync, // Use mutateAsync to return a promise
    signup: sendOtpMutation.mutateAsync, // Alias for sendOtp
    sendOtp: sendOtpMutation.mutateAsync,
    verifyOtp: verifyOtpMutation.mutate,
    logout,
    isLoading:
      loginMutation.isPending ||
      sendOtpMutation.isPending ||
      verifyOtpMutation.isPending,
    error:
      loginMutation.error || sendOtpMutation.error || verifyOtpMutation.error,
  };
};
