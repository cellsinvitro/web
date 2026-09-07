"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const googleErrors: Record<string, string> = {
  google: "Google sign-in failed. Please try again.",
  google_denied: "Google sign-in was cancelled.",
  google_email: "Google did not provide a verified email address.",
  google_config: "Google sign-in is not configured yet.",
};

type AuthTab = "login" | "register";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

export default function AuthForm({
  initialTab = "login",
  oauthError,
  redirectTo = "/dashboard",
}: {
  initialTab?: AuthTab;
  oauthError?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { login, sendOtp, register } = useAuth();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (!oauthError) return null;
    return googleErrors[oauthError] ?? googleErrors.google ?? null;
  });
  const [submitting, setSubmitting] = useState(false);

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setError(null);
    setOtpSuccessMessage(null);
    setOtpStep(1);
    setOtpCode("");
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSendingOtp(true);
    setError(null);
    setOtpSuccessMessage(null);
    try {
      await sendOtp(email.trim(), "REGISTRATION");
      setOtpStep(2);
      setOtpSuccessMessage(`Verification code sent to ${email.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (tab === "register" && otpStep === 1) {
      await handleSendOtp();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (tab === "login") {
        await login(email.trim(), password);
      } else {
        if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
          setError("Please enter the 6-digit OTP code sent to your email.");
          setSubmitting(false);
          return;
        }
        await register(name.trim(), email.trim(), password, otpCode.trim());
      }
      router.push(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tab === "login"
            ? "Unable to sign in."
            : "Unable to create your account."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <div
        role="tablist"
        aria-label="Authentication"
        className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "login"}
          onClick={() => switchTab("login")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
            tab === "login"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "register"}
          onClick={() => switchTab("register")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
            tab === "register"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Register
        </button>
      </div>

      <GoogleSignInButton label="Continue with Google" compact redirectTo={redirectTo} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          or
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === "login" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                className={inputClassName}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className={`${inputClassName} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
          </div>
        ) : otpStep === 1 ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Name
              </span>
              <input
                type="text"
                name="name"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${inputClassName} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOtpStep(1)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                ← Back to details
              </button>
              <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                Step 2 of 2
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Enter Verification Code
              </h3>
              <p className="text-xs text-slate-500">
                A 6-digit OTP code was sent to{" "}
                <span className="font-semibold text-slate-900">{email}</span>
              </p>
            </div>

            <label className="block space-y-1.5">
              <input
                type="text"
                name="otpCode"
                required
                maxLength={6}
                pattern="\d{6}"
                autoFocus
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • • • •"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-center font-mono text-xl font-bold tracking-[0.4em] text-slate-950 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-300"
              />
            </label>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500">Didn&apos;t receive code?</span>
              <button
                type="button"
                disabled={sendingOtp}
                onClick={handleSendOtp}
                className="font-semibold text-slate-900 hover:underline disabled:opacity-50"
              >
                {sendingOtp ? "Resending…" : "Resend OTP"}
              </button>
            </div>
          </div>
        )}

        {otpSuccessMessage && (
          <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5" role="status">
            {otpSuccessMessage}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {tab === "register" && otpStep === 1 ? (
          <button
            type="button"
            disabled={sendingOtp}
            onClick={handleSendOtp}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sendingOtp ? "Sending OTP via Brevo…" : "Send Verification OTP"}
            {!sendingOtp && <span>→</span>}
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting
              ? tab === "login"
                ? "Signing in…"
                : "Creating account…"
              : tab === "login"
                ? "Sign in"
                : "Verify OTP & Complete Registration"}
            {!submitting && <span>→</span>}
          </button>
        )}
      </form>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
