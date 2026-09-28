import "server-only";

// TODO: replace with supabase.auth.getUser() once auth lands
export async function getCurrentUserId() {
  return "123e4567-e89b-12d3-a456-426614174000";
}
