import { NextRequest, NextResponse } from "next/server";

const PRODUCTION_API_ORIGIN = "https://cellsinvitro.onrender.com";

function getApiOrigin() {
  if (process.env.API_ORIGIN) return process.env.API_ORIGIN.replace(/\/$/, "");
  if (process.env.VERCEL) return PRODUCTION_API_ORIGIN;
  return "http://localhost:3000";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/admin") || pathname.startsWith("/maintenance")) return NextResponse.next();

  const checkUrl = new URL("/maintenance/check", `${getApiOrigin()}/`);
  checkUrl.searchParams.set("scope", "WEB_PATH");
  checkUrl.searchParams.set("path", pathname);

  // Use a short timeout so a slow or cold-starting API server never blocks the
  // Vercel function for its full 300 s limit and causes a 504.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const headers = new Headers();
    const cookie = request.headers.get("cookie");
    const authorization = request.headers.get("authorization");
    if (cookie) headers.set("cookie", cookie);
    if (authorization) headers.set("authorization", authorization);
    const response = await fetch(checkUrl, {
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.ok) {
      const data = (await response.json()) as { blocked?: boolean; message?: string };
      if (data.blocked) {
        const maintenanceUrl = request.nextUrl.clone();
        maintenanceUrl.pathname = "/maintenance";
        maintenanceUrl.search = new URLSearchParams({ message: data.message || "", path: pathname }).toString();
        return NextResponse.rewrite(maintenanceUrl);
      }
    }
  } catch {
    // A maintenance check must not make the website unavailable when the API is
    // unreachable or when the request times out (e.g. Render cold-start).
  } finally {
    clearTimeout(timeoutId);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|fonts).*)"],
};