import { NextResponse, type NextRequest } from "next/server";
import { decryptSession } from "@/lib/auth/session";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminLoginRoute = pathname === "/admin/login";
  const isAdminApiRoute = pathname.startsWith("/api/admin");
  const isPortalRoute = pathname.startsWith("/portal");

  const sessionCookie = request.cookies.get("admin_session")?.value;
  const session = sessionCookie ? await decryptSession(sessionCookie) : null;
  const hasSession = !!(session && session.userId);
  const isAdmin = !!(hasSession && session.role === "ADMIN");
  const isUser = !!(hasSession && session.role === "USER");

  // Protect /admin UI routes: requires ADMIN role
  if (isAdminRoute) {
    if (!hasSession) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Authenticated non-admin (USER) attempting to access /admin is redirected to /portal
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  // Protect /api/admin routes: requires ADMIN role
  if (isAdminApiRoute && !isAdmin) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized access.",
      },
      { status: 401 }
    );
  }

  // Protect /portal UI routes: requires authenticated session
  if (isPortalRoute && !hasSession) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /admin/login to their respective area
  if (isAdminLoginRoute && hasSession) {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (isUser) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/portal/:path*",
  ],
};
