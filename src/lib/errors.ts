import { NextResponse } from "next/server";

export type PublicError = {
  code: string;
  message: string;
  request_id: string;
  retryable: boolean;
};

export function publicError(code: string, message: string, retryable = false): PublicError {
  return { code, message, request_id: crypto.randomUUID(), retryable };
}

export function errorResponse(status: number, code: string, message: string, retryable = false) {
  return NextResponse.json({ error: publicError(code, message, retryable) }, { status });
}

export function safeNextPath(value: string | null | undefined, fallback = "/app") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials") || normalized.includes("invalid email or password")) return "That email and password combination was not recognised.";
  if (normalized.includes("email not confirmed")) return "Confirm your email address before signing in.";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) return "An account already exists for this email. Try signing in.";
  if (normalized.includes("password")) return "Password must be at least 8 characters.";
  return "Authentication failed. Please try again.";
}
