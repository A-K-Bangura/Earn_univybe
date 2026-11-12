import type { NavigateFunction } from "react-router-dom";
import { isAuthenticated } from "../services/auth";

/**
 * Gate an account-scoped action (enroll, like, comment, share, ...) behind
 * login. Returns true if the caller may proceed; otherwise redirects a
 * guest to signup and returns false.
 */
export const requireAuthOrRedirect = (navigate: NavigateFunction): boolean => {
  if (isAuthenticated()) return true;
  navigate("/auth/signup");
  return false;
};
