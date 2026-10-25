import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .email("Enter a valid email address");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(150, "Name is too long"),
    email: email.max(320, "Email is too long"),
    // Mirrors RegisterDto (bcrypt only reads the first 72 bytes).
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use at most 72 characters"),
    confirmPassword: z.string().min(1, "Re-enter your password"),
    acceptTerms: z.boolean().refine((v) => v, "Please accept the terms to continue"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type SignupValues = z.infer<typeof signupSchema>;

export const otpSchema = z.object({
  email,
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type OtpValues = z.infer<typeof otpSchema>;
