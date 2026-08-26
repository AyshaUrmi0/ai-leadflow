import { NextResponse, type NextRequest } from "next/server";
import { decryptSession } from "@/lib/auth/session";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminLoginRoute = pathname === "/admin/login";
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  const sessionCookie = request.cookies.get("admin_session")?.value;
  const session = sessionCookie ? await decryptSession(sessionCookie) : null;
  const isAuthenticated = !!(session && session.userId && session.role === "ADMIN");

  // Redirect unauthenticated users attempting to access /admin UI routes
  if (isAdminRoute && !isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect unauthenticated users attempting to access /api/admin routes
  if (isAdminApiRoute && !isAuthenticated) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized access.",
      },
      { status: 401 }
    );
  }

  // Redirect authenticated admin users away from /admin/login to /admin/leads
  if (isAdminLoginRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/leads", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
