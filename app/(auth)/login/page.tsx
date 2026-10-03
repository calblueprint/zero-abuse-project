"use client";

// Runs in the browser so Supabase can store the login session.
import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/actions/supabase/client";

// SIGN INN
export default function Login() {
  // Sends the user to the success page after sign in works.
  const router = useRouter();

  // These remember what is typed in the inputs below.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // message is the text shown under the buttons. setMessage updates it.
  // basically if an error occurs, the error message is inputted into the message state.
  const [message, setMessage] = useState("");

  // SIGN UPPP!! Creates an account. data is the new user. error is set when Supabase says no.
  const handleSignUp = async () => {
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // Stores Supabase's reason in message so the page can show it.
    if (error) {
      setMessage(error.message);
      return;
    }

    // data is the new account. Leave this return as it is. A session often
    // does not exist until the person confirms their email, so do not redirect.
    return data;
  };

  // Signs in an existing account. Same shape as handleSignUp.
  const signInWithEmail = async () => {
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/app/auth/success");
    return data;
  };

  // Clears the session. Same shape again: call Supabase, then check error.
  const handleSignOut = async () => {
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Sign out successful");
  };

  // Sprint addition: a new function here, in the same shape as handleSignOut.
  // It emails a reset link for the email already stored in state. Tell
  // Supabase to send the person back to this login page. That address must
  // also be allowed in the Supabase dashboard under Authentication, URL
  // configuration. The auth method to look up is resetPasswordForEmail.

  const handleResetPassword = async () => {
    setMessage("");

    const { error, data } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Reset password email sent");
    return data;
  };

  // Sprint addition: a second new function under that one, same shape as
  // handleSignOut. The person opens the email link first, which signs them
  // in and returns them here. This function then saves a new password from
  // the password state. The auth method to look up is updateUser.

  const handleUpdatePassword = async () => {
    setMessage("");

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Password updated");
    return data;
  };
  return (
    <>
      <input
        name="email"
        onChange={e => setEmail(e.target.value)}
        value={email}
      />
      <input
        type="password"
        name="password"
        onChange={e => setPassword(e.target.value)}
        value={password}
      />
      <button type="button" onClick={handleSignUp}>
        Sign up
      </button>
      <button type="button" onClick={signInWithEmail}>
        Sign in
      </button>
      <button type="button" onClick={handleSignOut}>
        Sign out
      </button>
      <button type="button" onClick={handleResetPassword}>
        Reset password
      </button>
      <button type="button" onClick={handleUpdatePassword}>
        Update password
      </button>
      <p>{message}</p>
    </>
  );
}
