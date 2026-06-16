import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
// bcryptjs wird lazy in authorize() geladen – nicht in Edge/Middleware benötigt
import { z } from "zod";

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

        const resident = await prisma.resident.findUnique({
          where: { loginEmail: email.toLowerCase() },
          include: { apartment: { include: { building: true } } },
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

        const role = resident.role;

        return {
          id: resident.id,
          email: resident.loginEmail,
          name: `${resident.firstName || ""} ${resident.lastName || ""}`.trim(),
          role,
          apartmentId: resident.apartmentId,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
        session.user.apartmentId = token.apartmentId as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.apartmentId = user.apartmentId;
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
