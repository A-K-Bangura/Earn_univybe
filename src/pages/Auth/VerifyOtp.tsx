import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AlertCircle } from "lucide-react";
import { AuthLayout } from "../../components/auth/AuthLayout";

export const VerifyOtp = () => {
  const location = useLocation();
  const { verifyOtp, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Get email from location state or localStorage
  useEffect(() => {
    const emailParam =
      location.state?.email || localStorage.getItem("signup_email");
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem("signup_email", emailParam);
    }
  }, [location.state]);

  // Countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setLocalError("Please enter a complete 6-digit code");
      return;
    }

    if (!email) {
      setLocalError("Email is required");
      return;
    }

    verifyOtp({
      email,
      otp: otpString,
    });
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    setCountdown(60);
    setCanResend(false);
    // TODO: Implement resend OTP using sendOtp service
    console.log("Resending OTP to:", email);
  };

  const errorMessage = error instanceof Error ? error.message : localError;

  return (
    <AuthLayout
      pose="mail"
      message="Pop in the 6-digit code from your email and you're in!"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Verify Email
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
        We've sent a 6-digit code to
      </p>
      <p className="text-gray-900 dark:text-white font-semibold text-center mb-8">
        {email}
      </p>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      )}

      {/* OTP Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Input */}
        <div className="flex justify-center gap-2 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-azure-500 transition-all"
              disabled={isLoading}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
        >
          {isLoading ? "Verifying..." : "Verify"}
        </button>
      </form>

      {/* Resend Code */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Didn't receive the code?
        </p>
        <button
          onClick={handleResend}
          disabled={!canResend}
          className="text-azure-500 hover:text-azure-600 font-semibold text-sm disabled:text-gray-400"
        >
          {canResend ? "Resend Code" : `Resend in ${countdown}s`}
        </button>
      </div>

      {/* Back to Login */}
      <div className="mt-8 text-center">
        <Link
          to="/auth/login"
          className="text-gray-600 dark:text-gray-400 hover:text-azure-500 text-sm"
        >
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
};
