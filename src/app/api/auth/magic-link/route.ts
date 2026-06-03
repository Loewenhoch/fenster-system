import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { magicLinkSchema } from "@/lib/validators";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key");

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = magicLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bitte gültige E-Mail-Adresse eingeben" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const resident = await prisma.resident.findUnique({
      where: { loginEmail: email.toLowerCase() },
    });

    if (!resident) {
      return NextResponse.json(
        { message: "Falls ein Account existiert, wurde ein Link gesendet." },
        { status: 200 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.resident.update({
      where: { id: resident.id },
      data: {
        magicLinkToken: token,
        magicLinkExpires: expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const link = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "noreply@starhembergstr.at",
        to: resident.loginEmail!,
        subject: "Ihr Anmeldelink für das Sonnenschutz-Portal",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1e3a5f;">Anmelden beim Sonnenschutz-Portal</h1>
            <p>Hallo ${resident.firstName || ""} ${resident.lastName || ""},</p>
            <p>Sie haben einen Magic-Link angefordert. Klicken Sie auf den folgenden Button, um sich anzumelden:</p>
            <a href="${link}" style="display: inline-block; padding: 16px 32px; background-color: #1e3a5f; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; margin: 16px 0;">Jetzt anmelden</a>
            <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
            <p style="word-break: break-all; color: #5a6a7a;">${link}</p>
            <p style="color: #5a6a7a; font-size: 14px;">Der Link ist 24 Stunden gültig. Wenn Sie diesen Link nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>
          </div>
        `,
      });
    } else {
      console.log(
        "[Magic Link] Mock E-Mail (kein RESEND_API_KEY konfiguriert):",
        {
          to: resident.loginEmail,
          link,
        }
      );
    }

    return NextResponse.json(
      { message: "Falls ein Account existiert, wurde ein Link gesendet." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Magic Link Error:", error);
    return NextResponse.json(
      {
        error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
      },
      { status: 500 }
    );
  }
}
