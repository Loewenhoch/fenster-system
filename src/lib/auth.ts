import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { PrismaClient } from "@prisma/client";
// bcryptjs wird lazy in authorize() geladen – nicht in Edge/Middleware benötigt
import { z } from "zod";

const ACCOUNT_FIXES = [
  {
    email: "hofermarkus@promenteooe.at",
    residentId: "cmqhzak5z008qidslq6w45ymu",
    oldLoginEmail: "e1_cmqhzak5v008pidsl5cxftdme@placeholder.local",
    salutation: "Hr",
    firstName: "Markus",
    lastName: "Hofer",
    passwordHash:
      "$2b$12$XFzykNx9E4rZ4yiArsfk/.hlW3pzO/pDDkEYGKZDEhVlcGp4PACl6",
  },
  {
    email: "b-enzenhofer@gmx.at",
    residentId: "cmqhzak3b007yidslt85sbvis",
    oldLoginEmail: "e2_cmqhzak2x007uidslw0xsdb0d@placeholder.local",
    salutation: "Fr",
    firstName: "Bettina",
    lastName: "Enzenhofer",
    passwordHash:
      "$2b$12$RLHymUOzLKesm7W.0WY/8.wZGTEpM.vMhPHQS8463aMmddwYWeGcK",
  },
  {
    email: "v.auberger@aon.at",
    residentId: "cmqhzak7j0098idsl2swy1n3p",
    oldLoginEmail: "e2_cmqhzak720094idslt1pjzusm@placeholder.local",
    salutation: "Fr",
    firstName: "Verena",
    lastName: "Auberger",
    passwordHash:
      "$2b$12$wvvnzUl32dQCEs5nSwEzMu4fjHuibPFmIeemn8Z5alEW1PEfUd51q",
  },
  {
    email: "i.gassner@gmx.at",
    residentId: "cmqhzakbk00abidsl6wpxo144",
    oldLoginEmail: "e2_cmqhzakb000a7idslva4pf1yn@placeholder.local",
    salutation: "Fr",
    firstName: "Ingrid",
    lastName: "Gaßner",
    passwordHash:
      "$2b$12$8x6atkRowllvUVTx/gaRlO.cneibh8K1PfwUz8f4JzP4fBX0ADDkC",
  },
  {
    email: "erika.geistberger@sta-fenster.local",
    residentId: "cmqhzajls001yidsliw7gdnxm",
    oldLoginEmail: "e1_cmqhzajll001xidsl7ey67ajt@placeholder.local",
    salutation: "Fr",
    firstName: "Erika",
    lastName: "Geistberger",
    passwordHash:
      "$2b$12$2Ews6PmXR3xVomHp1W/DAObZfuxpUVibeaORHzDJbdnX0JIMuU0Ge",
  },
] as const;

async function ensureForgottenResidentAccount(
  prisma: PrismaClient,
  email: string
) {
  const account = ACCOUNT_FIXES.find((item) => item.email === email);
  if (!account) return;

  await prisma.resident.updateMany({
    where: {
      OR: [
        { id: account.residentId },
        { loginEmail: account.oldLoginEmail },
      ],
    },
    data: {
      salutation: account.salutation,
      title: null,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      loginEmail: account.email,
      passwordHash: account.passwordHash,
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

        await ensureForgottenResidentAccount(prisma, normalizedEmail);

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
