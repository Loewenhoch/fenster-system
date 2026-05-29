import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=missing_token", request.url)
      );
    }

    const resident = await prisma.resident.findUnique({
      where: { magicLinkToken: token },
    });

    if (
      !resident ||
      !resident.magicLinkExpires ||
      resident.magicLinkExpires < new Date()
    ) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_token", request.url)
      );
    }

    await prisma.resident.update({
      where: { id: resident.id },
      data: {
        loginEnabled: true,
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.redirect(
      new URL(
        `/login?token=${encodeURIComponent(token)}&email=${encodeURIComponent(resident.loginEmail || "")}`,
        request.url
      )
    );
  } catch (error) {
    console.error("Magic Link Verify Error:", error);
    return NextResponse.redirect(
      new URL("/login?error=server_error", request.url)
    );
  }
}
