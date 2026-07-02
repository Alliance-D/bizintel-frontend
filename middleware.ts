import { NextRequest, NextResponse } from "next/server";
import { ROLE_COOKIE } from "@/lib/auth";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function middleware(request: NextRequest) {
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  if (!role || !ADMIN_ROLES.has(role)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
