import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { isAuthenticated } from "../../services/auth";

export const GuestBanner = () => {
  if (isAuthenticated()) return null;

  return (
    <div className="bg-gradient-to-r from-azure-500 to-blue-violet-500 text-white rounded-lg px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <span>You're browsing as a guest. Sign up to enroll, save progress, and join in.</span>
      </div>
      <Link
        to="/auth/signup"
        className="flex-shrink-0 bg-white text-azure-600 hover:bg-gray-100 px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors"
      >
        Sign Up
      </Link>
    </div>
  );
};
