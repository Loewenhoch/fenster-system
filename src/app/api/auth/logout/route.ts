import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Clear Auth.js v5 cookies for both secure production and local variants.
  const authCookies = [
    "authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
  ];

  for (const name of authCookies) {
    cookieStore.delete(name);
    cookieStore.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  }

  return NextResponse.json({ success: true });
}
