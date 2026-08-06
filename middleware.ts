import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token");

  if (
    token &&
    req.nextUrl.pathname === "/"
  ) {
    return NextResponse.redirect(
      new URL("/dashboard", req.url)
    );
  }

  return NextResponse.next();
}