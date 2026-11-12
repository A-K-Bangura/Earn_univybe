import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Mail, AlertCircle, CheckCircle, Info } from "lucide-react";
import { AuthLayout } from "../../components/auth/AuthLayout";

export const Signup = () => {
  const { signup, isLoading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session-expired";
  // After an expiry, pre-fill the email they verified with so recovery is one tap.
  const [email, setEmail] = useState(() =>
    sessionExpired ? localStorage.getItem("signup_email") ?? "" : ""
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email) {
      setLocalError("Please enter your email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError("Please enter a valid email address");
      return;
    }

    // Store email for verification page
    localStorage.setItem("signup_email", email);
    
    signup(email); // Now calls sendOtp with just email
    setEmailSent(true);
  };

  const errorMessage = error instanceof Error ? error.message : localError;

  if (emailSent) {
    return (
      <AuthLayout
        pose="mail"
        message="Your code is on its way. Check your inbox (and spam, just in case)!"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Check Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We've sent a verification code to <strong>{email}</strong>
          </p>
          <Link
            to="/auth/verify"
            className="inline-block bg-azure-500 hover:bg-azure-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
          >
            Continue to Verification
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pose="learning"
      message="Learn, level up and earn rewards. It all starts with one email!"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Create Account
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
        Start your learning journey today
      </p>

      {sessionExpired && (
        <div
          role="status"
          className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Your session expired before you finished setting up. Verify your
            email again and you'll continue where you left off — your answers
            are saved on this device.
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all"
              disabled={isLoading}
              required
            />
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We'll send a verification code to your email
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link
          to="/auth/login"
          className="text-azure-500 hover:text-azure-600 font-semibold"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
