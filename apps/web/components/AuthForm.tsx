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
}: {
  initialTab?: AuthTab;
  oauthError?: string;
}) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (!oauthError) return null;
    return googleErrors[oauthError] ?? googleErrors.google ?? null;
  });
  const [submitting, setSubmitting] = useState(false);

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (tab === "login") {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      router.push("/");
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

      <GoogleSignInButton label="Continue with Google" compact />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          or
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === "register" && (
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
        )}

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
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete={
                tab === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                tab === "login" ? "Your password" : "At least 8 characters"
              }
              className={inputClassName}
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

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
              : "Create account"}
          {!submitting && <span>→</span>}
        </button>
      </form>
    </div>
  );
}
