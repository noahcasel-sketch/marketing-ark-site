"use client";
import { useState } from "react";

export default function InviteForm({ adminEmail }: { adminEmail: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Send the current admin email so the API can verify allowlist
          "X-Admin-Email": adminEmail,
        },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (!res.ok) {
        setMsg(`Error: ${json.error || res.statusText}`);
      } else {
        setMsg("Invite sent! Ask the rep to check their email.");
        setEmail("");
      }
    } catch (err: any) {
      setMsg(`Error: ${err?.message || "Network error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <label htmlFor="email">Rep Email (@marketing-ark.com)</label>
      <input
        id="email"
        type="email"
        placeholder="rep@marketing-ark.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send Invite"}
      </button>
      {msg && <p>{msg}</p>}
    </form>
  );
}
