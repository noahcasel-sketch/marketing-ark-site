"use client";
import { useState } from "react";
import { supabaseBrowser } from "@lib/supabaseBrowser";

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
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/portal` : undefined
      }
    });
    setStatus(error ? `Error: ${error.message}` : "Check your email for a login link.");
  };

  return (
    <main style={{ maxWidth: 420, margin: "64px auto" }}>
      <h1 style={{ marginBottom: 12 }}>Rep Login</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Use your company email to receive a one‑time login link.</p>
      <form onSubmit={signIn} className="card">
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@marketing-ark.com" />
        <button className="btn" style={{ marginTop: 14 }} type="submit">Send Link</button>
      </form>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}
