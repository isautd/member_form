import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("isa_session")?.value;
  const session = await verifySession(token);
  const role = session?.role ?? null;
  const path = req.nextUrl.pathname;

  if (path.startsWith("/admin") && role !== "admin") {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/scan") && role !== "admin" && role !== "officer") {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/scan/:path*"],
};