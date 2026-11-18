import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Mail, AlertCircle, CheckCircle, Info, Gift, Check, X } from "lucide-react";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { validateReferralCode } from "../../services/referrals";
import { getStoredReferralCapture } from "../../utils/referralCapture";

const REFERRAL_CHECK_DEBOUNCE_MS = 400;

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

  // Round 15: a referral captured from a `?ref=` link (see ReferralCapture)
  // pre-fills this field but is NOT "edited" — it's only "typed" once the
  // student actually changes it, which flips what gets sent at submit time
  // (docs/REFERRAL_AMBASSADOR_API.md "Frontend integration checklist" A.3-4).
  const [storedReferral] = useState(() => getStoredReferralCapture());
  const [referralFieldOpen, setReferralFieldOpen] = useState(
    () => !!storedReferral
  );
  const [referralCode, setReferralCode] = useState(
    () => storedReferral?.code ?? ""
  );
  const [referralEdited, setReferralEdited] = useState(false);
  const [referralCheck, setReferralCheck] = useState<{
    status: "idle" | "checking" | "valid" | "invalid";
    canonicalCode: string | null;
  }>({ status: "idle", canonicalCode: null });

  // Live-validate a typed/edited code before it's ever submitted — a
  // rejected code should cost the student nothing (checklist A.2/A.3).
  useEffect(() => {
    const code = referralCode.trim();
    if (!code) {
      setReferralCheck({ status: "idle", canonicalCode: null });
      return;
    }

    setReferralCheck({ status: "checking", canonicalCode: null });
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await validateReferralCode(code);
          setReferralCheck({
            status: result.valid ? "valid" : "invalid",
            canonicalCode: result.valid ? result.code : null,
          });
        } catch {
          // A failed check (network, rate limit) blocks nothing.
          setReferralCheck({ status: "idle", canonicalCode: null });
        }
      })();
    }, REFERRAL_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [referralCode]);

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

    // Typed/edited beats a stored link; a stored link (unedited) is sent
    // with its capture time; otherwise neither field is sent.
    const typedCode = referralEdited ? referralCode.trim() : "";
    const current = getStoredReferralCapture();
    const referralParams = typedCode
      ? { referral_code: typedCode }
      : !referralEdited && current
        ? {
            referral_code: current.code,
            referral_captured_at: new Date(current.captured_at).toISOString(),
          }
        : {};

    try {
      await signup({ email, ...referralParams });
      setEmailSent(true);
    } catch {
      setEmailSent(false);
    }
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
      message="Opportunities, gigs and community. It all starts with one email!"
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

        {/* Referral code (Round 15) — optional, never blocks sign-up */}
        <div>
          {referralFieldOpen ? (
            <>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Referral code (optional)
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    setReferralEdited(true);
                  }}
                  placeholder="e.g. ABA2026"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all uppercase"
                  disabled={isLoading}
                />
              </div>
              {referralCheck.status === "checking" && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Checking…
                </p>
              )}
              {referralCheck.status === "valid" && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" /> Code applied —{" "}
                  {referralCheck.canonicalCode}
                </p>
              )}
              {referralCheck.status === "invalid" && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <X className="w-4 h-4" /> This referral code is not valid.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setReferralFieldOpen(true)}
              className="text-sm font-medium text-azure-500 hover:text-azure-600"
            >
              Have a referral code?
            </button>
          )}
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
