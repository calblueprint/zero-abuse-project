import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/actions/supabase/server";

export type VerifiedAuthUser = User & { email: string };

export async function getVerifiedAuthUser(): Promise<VerifiedAuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email || !user.email_confirmed_at) {
    return null;
  }

  return { ...user, email: user.email };
}

export async function requireVerifiedAuthUser(): Promise<VerifiedAuthUser> {
  const user = await getVerifiedAuthUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentUserId(): Promise<string> {
  return (await requireVerifiedAuthUser()).id;
}
