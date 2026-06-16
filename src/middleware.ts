import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((request) => {
  const { nextUrl } = request;
  const isLoggedIn = !!request.auth?.user;
  const isAdmin = request.auth?.user?.role === "ADMIN";

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute =
    nextUrl.pathname === "/login" ||
    nextUrl.pathname === "/datenschutz" ||
    nextUrl.pathname === "/agb" ||
    nextUrl.pathname === "/widerruf" ||
    nextUrl.pathname === "/impressum" ||
    nextUrl.pathname === "/";

  const isAdminRoute = nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/");
  const isApiRoute = nextUrl.pathname.startsWith("/api/");

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
