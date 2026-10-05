import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/actions/supabase/server";

export type VerifiedAuthUser = {
  id: string;
  email: string;
};

export async function getVerifiedAuthUser(): Promise<VerifiedAuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const email = data?.claims.email;

  if (error || !data || typeof email !== "string") {
    return null;
  }

  return { id: data.claims.sub, email };
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
