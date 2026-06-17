import { NextRequest, NextResponse } from "next/server";

function logoutResponse(request: NextRequest) {
  // Clear Auth.js v5 cookies for both secure production and local variants.
  const knownAuthCookies = [
    "authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
    "next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.callback-url",
    "__Host-next-auth.csrf-token",
  ];

  const response = NextResponse.json({ success: true });
  const requestAuthCookies = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.includes("authjs") || name.includes("next-auth"));

  for (const name of new Set([...knownAuthCookies, ...requestAuthCookies])) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  return logoutResponse(request);
}

export async function GET(request: NextRequest) {
  const response = logoutResponse(request);
  response.headers.set("Location", "/login");
  return new NextResponse(response.body, {
    status: 302,
    headers: response.headers,
  });
}
