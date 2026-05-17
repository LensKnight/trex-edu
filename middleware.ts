import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") || "";
  const isMobile = /iPhone|Android|iPad|Mobile/i.test(ua);

  const { pathname } = request.nextUrl;

  // Already mobile path pe hai toh skip
  if (pathname.startsWith("/mobile")) return NextResponse.next();

  // Login page pe redirect mat karo
  if (pathname === "/") return NextResponse.next();

  if (isMobile) {
    return NextResponse.redirect(new URL(`/mobile${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/feed", "/upload", "/profile", "/chat", "/announcements", "/classmates"],
};