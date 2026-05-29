import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Bitte gültige E-Mail eingeben"),
  password: z.string().min(1, "Passwort erforderlich"),
});

export const magicLinkSchema = z.object({
  email: z.string().email("Bitte gültige E-Mail eingeben"),
});

export const orderConfirmationSchema = z.object({
  privacyAccepted: z.literal(true),
  termsAccepted: z.literal(true),
  withdrawalAccepted: z.literal(true),
  confirmationName: z.string().min(2, "Name ist erforderlich"),
  confirmationSignature: z.string().optional(),
});

export const residentProfileSchema = z.object({
  firstName: z.string().min(1, "Vorname erforderlich"),
  lastName: z.string().min(1, "Nachname erforderlich"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const createResidentSchema = z.object({
  apartmentId: z.string(),
  role: z.enum(["OWNER_PRIMARY", "OWNER_SECONDARY", "TENANT"]),
  salutation: z.string().optional(),
  title: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  loginEmail: z.string().email().optional(),
  isPrimaryContact: z.boolean().default(false),
  loginEnabled: z.boolean().default(false),
});

export const updateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  unitPrice: z.number().min(0),
  isActive: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type OrderConfirmationInput = z.infer<typeof orderConfirmationSchema>;
export type ResidentProfileInput = z.infer<typeof residentProfileSchema>;
export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
