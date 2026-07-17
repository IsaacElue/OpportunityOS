import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"), "/onboarding");

  if (!code) return NextResponse.redirect(new URL("/auth?error=missing_code", requestUrl.origin));

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = getPublicEnv();
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } }
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth?error=confirmation_failed", requestUrl.origin));
  return response;
}
