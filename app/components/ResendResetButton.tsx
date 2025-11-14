"use client";

import { useState } from "react";

export default function ResendResetButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/resend-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to send reset email");
      setMsg("Reset email sent.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {/* render yours above this: “Mark Inactive” */}
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Resend password reset"}
      </button>
      {msg && <p className="text-xs text-gray-600">{msg}</p>}
    </div>
  );
}
