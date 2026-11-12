import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Mail, Lock, AlertCircle, Phone, Eye, EyeOff } from "lucide-react";
import { ApiError } from "../../utils/apiError";
import { AuthLayout } from "../../components/auth/AuthLayout";

export const Login = () => {
  const { login, isLoading, error } = useAuth();
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear errors when switching login methods
  useEffect(() => {
    setLocalError(null);
  }, [loginMethod]);

  // Input sanitization helper
  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, "");
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation
  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedPassword = password.trim();

    // Validation
    if (loginMethod === "email") {
      if (!sanitizedEmail) {
        setLocalError("Please enter your email address");
        return;
      }
      if (!isValidEmail(sanitizedEmail)) {
        setLocalError("Please enter a valid email address");
        return;
      }
    } else {
      if (!sanitizedPhone) {
        setLocalError("Please enter your phone number");
        return;
      }
      if (!isValidPhone(sanitizedPhone)) {
        setLocalError(
          "Please enter a valid phone number (e.g., +232 76 123 4567)"
        );
        return;
      }
    }

    if (!sanitizedPassword) {
      setLocalError("Please enter your password");
      return;
    }

    if (sanitizedPassword.length < 8) {
      setLocalError("Password must be at least 8 characters long");
      return;
    }

    // Increment attempt count
    setAttemptCount((prev) => prev + 1);

    // Rate limiting warning (client-side check)
    if (attemptCount >= 5) {
      setLocalError(
        "Too many login attempts. Please wait a few minutes before trying again."
      );
      return;
    }

    try {
      await login({
        [loginMethod]:
          loginMethod === "email" ? sanitizedEmail : sanitizedPhone,
        password: sanitizedPassword,
      });
      // Reset attempt count on successful login
      setAttemptCount(0);
      // Clear form on success (though navigation will happen)
      setEmail("");
      setPhone("");
      setPassword("");
    } catch {
      // Error is handled by React Query and will be available in the error prop
      // Don't clear form fields on error - keep them so user can correct and retry
      // The error will be displayed via the error prop from useAuth
    }
  };

  // Get user-friendly error message
  const getErrorMessage = (): string | null => {
    if (localError) return localError;

    if (error) {
      if (error instanceof ApiError) {
        return error.getUserFriendlyMessage();
      }
      if (error instanceof Error) {
        return error.message;
      }
    }

    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <AuthLayout
      pose="cool"
      message="Good to see you again! Let's pick up right where you left off."
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Welcome Back
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
        Sign in to continue your learning journey
      </p>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                {error instanceof ApiError &&
                error.code === "LOGIN_FAILED" &&
                error.details?.details === "The selected email is invalid."
                  ? "Email Not Found"
                  : error instanceof ApiError &&
                    error.code === "INVALID_CREDENTIALS"
                  ? "Invalid Credentials"
                  : "Login Error"}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
              {error instanceof ApiError &&
                error.code === "LOGIN_FAILED" &&
                error.details?.details ===
                  "The selected email is invalid." && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                      Don't have an account?
                    </p>
                    <Link
                      to="/auth/signup"
                      className="text-xs text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 font-semibold underline"
                    >
                      Sign up here
                    </Link>
                  </div>
                )}
              {error instanceof ApiError &&
                error.code === "INVALID_CREDENTIALS" && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <Link
                      to="/auth/forgot-password"
                      className="text-xs text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 font-semibold underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Login Method Toggle */}
      <div className="mb-6 flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setLoginMethod("email");
            setLocalError(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMethod === "email"
              ? "bg-white dark:bg-gray-700 text-azure-500 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMethod("phone");
            setLocalError(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMethod === "phone"
              ? "bg-white dark:bg-gray-700 text-azure-500 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Phone
        </button>
      </div>

      {/* Login Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
      >
        {/* Email or Phone */}
        <div>
          <label
            htmlFor={loginMethod === "email" ? "email-input" : "phone-input"}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {loginMethod === "email" ? "Email" : "Phone Number"}
          </label>
          <div className="relative">
            {loginMethod === "email" ? (
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            ) : (
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            )}
            <input
              id={loginMethod === "email" ? "email-input" : "phone-input"}
              type={loginMethod === "email" ? "email" : "tel"}
              value={loginMethod === "email" ? email : phone}
              onChange={(e) => {
                const value = e.target.value;
                if (loginMethod === "email") {
                  setEmail(value);
                } else {
                  setPhone(value);
                }
                // Clear error when user starts typing
                if (localError) setLocalError(null);
              }}
              placeholder={
                loginMethod === "email"
                  ? "student@example.com"
                  : "+232 76 123 4567"
              }
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all"
              disabled={isLoading}
              required
              autoComplete={loginMethod === "email" ? "email" : "tel"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              maxLength={loginMethod === "email" ? 255 : 20}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // Clear error when user starts typing
                if (localError) setLocalError(null);
              }}
              placeholder="Enter your password"
              className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all"
              disabled={isLoading}
              required
              autoComplete="current-password"
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Sign Up Link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Don't have an account?{" "}
        <Link
          to="/auth/signup"
          className="text-azure-500 hover:text-azure-600 font-semibold"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
};
