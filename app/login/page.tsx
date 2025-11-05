"use client";
import { useState } from "react";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Sending magic link...");

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // IMPORTANT: do not create new users when signups are disabled
        shouldCreateUser: false,
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/portal`
            : undefined,
      },
    });

    if (error) {
      // This is what you were seeing from Supabase
      if (error.message.includes("Signups not allowed")) {
        setStatus("No account found. Ask an admin to invite you.");
      } else {
        setStatus(`Error: ${error.message}`);
      }
    } else {
      setStatus("Check your email for a login link.");
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "64px auto" }}>
      <h1>Rep Login</h1>
      <form onSubmit={signIn} className="card">
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@marketing-ark.com"
        />
        <button className="btn" style={{ marginTop: 14 }} type="submit">
          Send Link
        </button>
      </form>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}
