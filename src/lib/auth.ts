import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { PrismaClient } from "@prisma/client";
// bcryptjs wird lazy in authorize() geladen – nicht in Edge/Middleware benötigt
import { z } from "zod";

const MARKUS_HOFER_EMAIL = "hofermarkus@promenteooe.at";
const MARKUS_HOFER_RESIDENT_ID = "cmqhzak5z008qidslq6w45ymu";
const MARKUS_HOFER_OLD_LOGIN = "e1_cmqhzak5v008pidsl5cxftdme@placeholder.local";
const MARKUS_HOFER_PASSWORD_HASH =
  "$2b$12$XFzykNx9E4rZ4yiArsfk/.hlW3pzO/pDDkEYGKZDEhVlcGp4PACl6";

async function ensureMarkusHoferAccount(
  prisma: PrismaClient,
  email: string
) {
  if (email !== MARKUS_HOFER_EMAIL) return;

  await prisma.resident.updateMany({
    where: {
      OR: [
        { id: MARKUS_HOFER_RESIDENT_ID },
        { loginEmail: MARKUS_HOFER_OLD_LOGIN },
      ],
    },
    data: {
      salutation: "Hr",
      title: null,
      firstName: "Markus",
      lastName: "Hofer",
      email: MARKUS_HOFER_EMAIL,
      loginEmail: MARKUS_HOFER_EMAIL,
      passwordHash: MARKUS_HOFER_PASSWORD_HASH,
      loginEnabled: true,
      magicLinkToken: null,
      magicLinkExpires: null,
    },
  });
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        // Lazy import von prisma – nur in Node.js API Routes, nie in Edge/Middleware
        const { prisma } = await import("@/lib/prisma");

        const parsed = z
          .object({ email: z.string().email(), password: z.string() })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        await ensureMarkusHoferAccount(prisma, normalizedEmail);

        const resident = await prisma.resident.findUnique({
          where: { loginEmail: normalizedEmail },
          include: {
            apartmentLinks: {
              orderBy: { createdAt: "asc" },
              include: { apartment: { include: { building: true } } },
            },
          },
        });

        if (!resident || !resident.passwordHash || !resident.loginEnabled) {
          return null;
        }

        const bcrypt = await import("bcryptjs");
        const valid = await bcrypt.compare(password, resident.passwordHash);
        if (!valid) return null;

        // Nicht-kritisches Update: darf Login nicht blockieren
        prisma.resident.update({
          where: { id: resident.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {
          // Ignoriere DB-Fehler bei lastLoginAt-Update
        });

        const apartmentIds = resident.apartmentLinks.map((l) => l.apartmentId);
        const primaryLink = resident.apartmentLinks.find((l) => l.isPrimaryContact)
          || resident.apartmentLinks[0];

        // Admin-Rolle falls Resident als Admin markiert, sonst Eigentümer-Rolle
        const role = resident.isAdmin ? "ADMIN" : primaryLink?.role || "OWNER";

        return {
          id: resident.id,
          email: resident.loginEmail,
          name: `${resident.firstName || ""} ${resident.lastName || ""}`.trim(),
          role,
          apartmentIds,
          primaryApartmentId: primaryLink?.apartmentId || null,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
        session.user.apartmentIds = (token.apartmentIds as string[]) || [];
        session.user.primaryApartmentId = token.primaryApartmentId as string | null | undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.apartmentIds = user.apartmentIds;
        token.primaryApartmentId = user.primaryApartmentId;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
});

export const isAdmin = (role: string) => role === "ADMIN";
