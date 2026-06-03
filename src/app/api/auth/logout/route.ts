import { NextResponse } from "next/server";

export async function POST() {
  // Clear Auth.js v5 cookies for both secure production and local variants.
  const authCookies = [
    "authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
  ];

  const response = NextResponse.json({ success: true });

  for (const name of authCookies) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
      secure: true,
    });
  }

  return response;
}
