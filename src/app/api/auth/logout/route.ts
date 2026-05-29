import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Lösche alle NextAuth-Session-Cookies
  const authCookies = [
    "authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.session-token",
    "__Secure-authjs.session-token",
  ];

  for (const name of authCookies) {
    cookieStore.delete(name);
  }

  return NextResponse.json({ success: true });
}
