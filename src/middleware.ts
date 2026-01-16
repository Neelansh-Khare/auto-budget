import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "./lib/session";

const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/status", "/auth/login", "/api/health"];

export async function middleware(req: NextRequest) {
  if (process.env.AUTH_DISABLED === "true") {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  if (PUBLIC_PATHS.some((p) => url.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // iron-session helper for NextRequest
  const res = NextResponse.next();
  // @ts-ignore iron-session overload for request/response objects
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (session.authenticated) {
    return res;
  }

  if (url.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

