import "server-only";
import { cache } from "react";
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

export const requireVerifiedAuthUser = cache(
  async (): Promise<VerifiedAuthUser> => {
    const user = await getVerifiedAuthUser();

    if (!user) {
      redirect("/login");
    }

    return user;
  },
);

export type AuthEmailState = {
  email: string;
  pendingEmail: string | null;
};

export async function getAuthEmailState(): Promise<AuthEmailState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    throw new Error("Unable to load the authenticated user's email state", {
      cause: error,
    });
  }

  return {
    email: data.user.email.trim().toLowerCase(),
    pendingEmail: data.user.new_email?.trim().toLowerCase() ?? null,
  };
}
