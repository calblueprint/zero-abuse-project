"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/actions/supabase/server";

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function redirectWithCode(
  path: string,
  key: "error" | "message",
  code: string,
) {
  const searchParams = new URLSearchParams({ [key]: code });
  redirect(`${path}?${searchParams}`);
}

async function siteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  return (await headers()).get("origin") ?? "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const email = formValue(formData, "email").trim().toLowerCase();
  const password = formValue(formData, "password");

  if (!validEmail(email)) {
    redirectWithCode("/login", "error", "invalid-email");
  }

  if (!password) {
    redirectWithCode("/login", "error", "missing-password");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      redirectWithCode("/login", "error", "email-not-confirmed");
    }

    redirectWithCode("/login", "error", "invalid-credentials");
  }

  if (!data.session) {
    redirectWithCode("/login", "error", "signin-failed");
  }

  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = formValue(formData, "email").trim().toLowerCase();
  const password = formValue(formData, "password");
  const confirmPassword = formValue(formData, "confirmPassword");

  if (!validEmail(email)) {
    redirectWithCode("/sign-up", "error", "invalid-email");
  }

  if (password.length < 8) {
    redirectWithCode("/sign-up", "error", "short-password");
  }

  if (password !== confirmPassword) {
    redirectWithCode("/sign-up", "error", "password-mismatch");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (
    error?.code === "email_exists" ||
    error?.code === "user_already_exists" ||
    data.user?.identities?.length === 0
  ) {
    redirectWithCode("/sign-up", "error", "email-already-registered");
  }

  if (error) {
    redirectWithCode("/sign-up", "error", "signup-failed");
  }

  if (data.session) {
    redirect("/");
  }

  const searchParams = new URLSearchParams({ email });
  redirect(`/verification-needed?${searchParams}`);
}

export async function resendVerification(formData: FormData) {
  const email = formValue(formData, "email").trim().toLowerCase();

  if (!validEmail(email)) {
    redirect("/sign-up");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });
  const searchParams = new URLSearchParams({
    email,
    ...(error ? { error: "resend-failed" } : { message: "resent" }),
  });

  redirect(`/verification-needed?${searchParams}`);
}

export async function requestPasswordReset(formData: FormData) {
  const email = formValue(formData, "email").trim().toLowerCase();

  if (!validEmail(email)) {
    redirectWithCode("/reset-password", "error", "invalid-email");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/update-password`,
  });

  if (error) {
    redirectWithCode("/reset-password", "error", "reset-failed");
  }

  redirectWithCode("/reset-password", "message", "email-sent");
}

export async function updatePassword(formData: FormData) {
  const password = formValue(formData, "password");
  const confirmPassword = formValue(formData, "confirmPassword");

  if (password.length < 8) {
    redirectWithCode("/update-password", "error", "short-password");
  }

  if (password !== confirmPassword) {
    redirectWithCode("/update-password", "error", "password-mismatch");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectWithCode("/login", "error", "expired-session");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithCode("/update-password", "error", "update-failed");
  }

  await supabase.auth.signOut({ scope: "global" });
  redirectWithCode("/login", "message", "password-updated");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
