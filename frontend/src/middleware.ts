import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const apiUrl = process.env.API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = new URL(request.url);
  const target = `${apiUrl}${url.pathname}${url.search}`;

  return NextResponse.rewrite(new URL(target));
}

export const config = {
  matcher: "/api/:path*",
};
