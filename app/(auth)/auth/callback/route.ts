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

function redirectAfterEmailChange(url: URL, completed: boolean) {
  const response = NextResponse.redirect(url);

  if (completed) {
    response.cookies.delete("email-change-requested");
  }

  return response;
}

async function continueEmailChange(requestUrl: URL) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const completed = !user.new_email;

  if (completed) {
    const { error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      return null;
    }
  }

  return redirectAfterEmailChange(new URL("/profile", requestUrl), completed);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const isEmailChange =
    request.cookies.get("email-change-requested")?.value === "true";

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const isPasswordRecovery =
      request.cookies.get("password-recovery-requested")?.value === "true";

    if (!error) {
      const nextPath = isPasswordRecovery
        ? "/update-password"
        : isEmailChange
          ? "/profile"
          : safeNextPath(requestUrl.searchParams.get("next"));
      const redirectUrl = new URL(nextPath, requestUrl);

      if (isPasswordRecovery) {
        return redirectAfterRecovery(redirectUrl);
      }

      if (isEmailChange) {
        return redirectAfterEmailChange(redirectUrl, !data.user.new_email);
      }

      return NextResponse.redirect(redirectUrl);
    }

    if (isPasswordRecovery) {
      const loginUrl = new URL("/login", requestUrl);
      loginUrl.searchParams.set("error", "invalid-reset-link");
      return redirectAfterRecovery(loginUrl);
    }
  }

  if (isEmailChange) {
    const response = await continueEmailChange(requestUrl);

    if (response) {
      return response;
    }
  }

  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("error", "invalid-auth-link");
  return NextResponse.redirect(loginUrl);
}
