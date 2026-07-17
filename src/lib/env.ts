import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("must be a valid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "must be set")
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function missingEnvironmentError(names: string[], context: "browser" | "server") {
  const hint = context === "browser"
    ? "Add them to .env.local with the NEXT_PUBLIC_ prefix."
    : "Add them to .env.local or your deployment environment.";
  return new Error(`OpportunityOS is missing required Supabase environment variables: ${names.join(", ")}. ${hint}`);
}

/** Read only browser-safe variables. Never add service credentials here. */
export function getPublicEnv(): PublicEnv {
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  };
  const parsed = publicEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const missing = Object.keys(raw).filter((name) => !raw[name as keyof typeof raw]);
    throw missingEnvironmentError(missing, typeof window === "undefined" ? "server" : "browser");
  }
  return parsed.data;
}
