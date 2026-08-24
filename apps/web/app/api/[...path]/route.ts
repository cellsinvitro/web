import { NextRequest, NextResponse } from "next/server";

const PRODUCTION_API_ORIGIN = "https://cellsinvitro.onrender.com";

function getApiOrigin() {
  if (process.env.API_ORIGIN) {
    return process.env.API_ORIGIN.replace(/\/$/, "");
  }
  if (process.env.VERCEL) {
    return PRODUCTION_API_ORIGIN;
  }
  return "http://localhost:3000";
}

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, path: string[]) {
  const apiOrigin = getApiOrigin();
  const url = new URL(path.join("/"), `${apiOrigin}/`);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  const requestContentType = request.headers.get("content-type");
  if (requestContentType) {
    headers.set("content-type", requestContentType);
  }
  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("accept", accept);
  }

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : requestContentType?.includes("multipart/form-data")
        ? await request.arrayBuffer()
        : await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    console.error("API proxy failed:", error);
    return NextResponse.json(
      {
        error:
          "Unable to reach the API server. Please try again in a moment.",
      },
      { status: 502 }
    );
  }

  const upstreamContentType = upstream.headers.get("content-type") || "";
  const isJson = upstreamContentType.includes("application/json");

  const responseBody = isJson
    ? await upstream.text()
    : await upstream.arrayBuffer();

  const responseHeaders = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-disposition",
    "cache-control",
    "x-content-type-options",
  ];

  for (const headerName of passthroughHeaders) {
    const value = upstream.headers.get(headerName);
    if (value) {
      responseHeaders.set(headerName, value);
    }
  }

  const location = upstream.headers.get("location");
  if (location) {
    responseHeaders.set("location", location);
  }

  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });

  for (const cookieValue of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookieValue);
  }

  return response;
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
