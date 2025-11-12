// app/region/ApproveButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ApproveButton({ id }: { id: string }) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onApprove() {
    start(async () => {
      setError(null);
      const res = await fetch("/api/reps/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId: id }),
      });
      const j = await res.json();
      if (!res.ok) setError(j.error || "Failed to approve");
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={onApprove}
        disabled={isPending}
        style={{
          background: "#16a34a",
          color: "white",
          borderRadius: 8,
          padding: "8px 14px",
          fontWeight: 600,
        }}
      >
        {isPending ? "Approving…" : "Approve"}
      </button>
      {error && <span style={{ color: "#ef4444", fontSize: 13 }}>{error}</span>}
    </div>
  );
}
