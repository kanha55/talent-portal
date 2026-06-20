import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/resumes", "/applications"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const session = request.cookies.get("tp_session")?.value;
  if (session) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/sign-in", request.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/resumes/:path*", "/applications/:path*"],
};
