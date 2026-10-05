import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/actions/supabase/server";

function safeNextPath(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL(safeNextPath(requestUrl.searchParams.get("next")), requestUrl),
      );
    }
  }

  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("error", "invalid-auth-link");
  return NextResponse.redirect(loginUrl);
}
