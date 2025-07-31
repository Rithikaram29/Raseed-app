import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next(); // Let backend handle auth
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
