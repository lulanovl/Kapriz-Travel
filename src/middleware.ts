import createIntlMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const authMiddleware = withAuth(
  function onSuccess(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (
      token?.role === "FINANCE" &&
      !pathname.startsWith("/admin/finance") &&
      !pathname.startsWith("/admin/reports") &&
      !pathname.startsWith("/admin/salary") &&
      !pathname.startsWith("/admin/tours") &&
      !pathname.startsWith("/admin/departures") &&
      !pathname.startsWith("/admin/calendar") &&
      pathname !== "/admin"
    ) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Admin: NextAuth protection only
  if (pathname.startsWith("/admin")) {
    return (authMiddleware as unknown as (req: NextRequest) => NextResponse)(
      req
    );
  }

  // API routes: no locale needed
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Guide pages: no locale needed
  if (pathname.startsWith("/guide")) {
    return NextResponse.next();
  }

  // Public site: locale routing
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
