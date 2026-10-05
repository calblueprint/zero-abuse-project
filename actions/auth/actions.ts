"use server";

import type { AuthActionState } from "@/actions/auth/state";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/actions/supabase/server";

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function credentials(formData: FormData, minimumPasswordLength = 1) {
  const email = formValue(formData, "email").trim().toLowerCase();
  const password = formValue(formData, "password");

  if (!validEmail(email)) {
    return { error: "Enter a valid email address." } as const;
  }

  if (password.length < minimumPasswordLength) {
    return {
      error: `Password must be at least ${minimumPasswordLength} characters.`,
    } as const;
  }

  return { email, password } as const;
}

async function siteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  return (await headers()).get("origin") ?? "http://localhost:3000";
}

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const values = credentials(formData);

  if ("error" in values) {
    return { status: "error", message: values.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(values);

  if (error) {
    return {
      status: "error",
      message: "The email or password is incorrect.",
    };
  }

  redirect("/");
}

export async function signUp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const values = credentials(formData, 8);

  if ("error" in values) {
    return { status: "error", message: values.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...values,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.session) {
    redirect("/");
  }

  return {
    status: "success",
    message: "Check your email to confirm your account.",
  };
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formValue(formData, "email").trim().toLowerCase();

  if (!validEmail(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/update-password`,
  });

  if (error) {
    return {
      status: "error",
      message: "Unable to send a reset email right now. Please try again.",
    };
  }

  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = formValue(formData, "password");
  const confirmation = formValue(formData, "confirmPassword");

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters.",
    };
  }

  if (password !== confirmation) {
    return { status: "error", message: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Your password has been updated." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
