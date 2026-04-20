import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Finance role: finance, reports, salary, tours (read-only), departures (expenses), dashboard
    if (
      token?.role === "FINANCE" &&
      !pathname.startsWith("/admin/finance") &&
      !pathname.startsWith("/admin/reports") &&
      !pathname.startsWith("/admin/salary") &&
      !pathname.startsWith("/admin/tours") &&
      !pathname.startsWith("/admin/departures") &&
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

export const config = {
  matcher: ["/admin/:path*"],
};
