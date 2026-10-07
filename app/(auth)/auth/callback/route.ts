import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/actions/supabase/server";

function safeNextPath(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function redirectAfterRecovery(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.delete("password-recovery-requested");
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (tokenHash && type === "recovery") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (!error) {
      return redirectAfterRecovery(new URL("/update-password", requestUrl));
    }

    const loginUrl = new URL("/login", requestUrl);
    loginUrl.searchParams.set("error", "invalid-reset-link");
    return redirectAfterRecovery(loginUrl);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const isPasswordRecovery =
      request.cookies.get("password-recovery-requested")?.value === "true";

    if (!error) {
      const nextPath = isPasswordRecovery
        ? "/update-password"
        : safeNextPath(requestUrl.searchParams.get("next"));
      const redirectUrl = new URL(nextPath, requestUrl);

      return isPasswordRecovery
        ? redirectAfterRecovery(redirectUrl)
        : NextResponse.redirect(redirectUrl);
    }

    if (isPasswordRecovery) {
      const loginUrl = new URL("/login", requestUrl);
      loginUrl.searchParams.set("error", "invalid-reset-link");
      return redirectAfterRecovery(loginUrl);
    }
  }

  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("error", "invalid-auth-link");
  return NextResponse.redirect(loginUrl);
}
