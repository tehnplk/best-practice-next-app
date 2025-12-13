import { z } from "zod";

export const GenderSchema = z.enum(["M", "F", "O"]);

const EmojiRegex = /\p{Extended_Pictographic}/u;

export const UpsertPopulationSchema = z.object({
  cid: z
    .string()
    .trim()
    .min(1, "Citizen ID is required")
    .regex(/^\d{13}$/, "Citizen ID must be 13 digits"),
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .refine((value) => !EmojiRegex.test(value), "Full name must not contain emoji"),
  gender: GenderSchema,
  birthDate: z.string().trim().min(1, "Birth date is required"),
});
