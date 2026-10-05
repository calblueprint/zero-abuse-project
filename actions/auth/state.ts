export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialAuthActionState: AuthActionState = { status: "idle" };
