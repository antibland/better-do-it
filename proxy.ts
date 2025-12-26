import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Get the origin from the request
    const origin = request.headers.get("origin");

    // Allow both www and non-www variants of your domain
    const allowedOrigins = [
      "https://better-do-it.com",
      "https://www.better-do-it.com",
    ];

    // Set CORS headers based on the requesting origin
    let corsOrigin = "https://better-do-it.com";
    if (origin && allowedOrigins.includes(origin)) {
      corsOrigin = origin;
    }

    // Create response with CORS headers
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
