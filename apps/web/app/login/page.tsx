import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Login | CellsInVitro",
  description: "Sign in or create your CellsInVitro account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const oauthError = params.error;
  const initialTab = params.tab === "register" ? "register" : "login";
  const redirectTo =
    params.redirect?.startsWith("/") && !params.redirect.startsWith("//")
      ? params.redirect
      : "/dashboard";

  return (
    <main className="flex h-dvh max-h-dvh items-center justify-center overflow-hidden bg-white px-4 py-6 sm:px-6">
      <div className="w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="grid md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-6 md:border-b-0 md:border-r md:px-7 md:py-7">
              <div>
                <Link href="/" className="inline-flex items-center gap-2.5">
                  <Image
                    src="/images/logo.png"
                    alt="CellsInVitro"
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                    priority
                  />
                  <span className="text-base font-bold tracking-tight text-slate-950">
                    CellsInVitro
                  </span>
                </Link>
                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
                  Welcome back
                </h1>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  Log in or create an account to continue your research
                  workspace.
                </p>
              </div>
              <p className="mt-6 hidden text-xs text-slate-400 md:block">
                Research kits · Collaboration · Secure access
              </p>
            </div>

            <div className="px-6 py-6 md:px-7 md:py-7">
              <AuthForm
                initialTab={initialTab}
                oauthError={oauthError}
                redirectTo={redirectTo}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
