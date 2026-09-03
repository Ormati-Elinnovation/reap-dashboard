import { NextResponse, type NextRequest } from "next/server";

// Dashboard is open (no login). Keep this file so Next still has a proxy hook.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
