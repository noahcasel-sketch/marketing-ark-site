// components/RepAdminList.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type AdminItem = {
  id: string;
  status: "awaiting" | "active" | "inactive";
  region_code?: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  submitted_at?: string | null; // for awaiting
  created_at?: string | null;   // for reps
  id_url?: string | null;
  // For reps only:
  is_rep?: boolean;
};

function StatusDot({ status }: { status: "awaiting" | "active" | "inactive" }) {
  const color =
    status === "awaiting" ? "#f59e0b" : status === "active" ? "#16a34a" : "#ef4444";
  return (
    <span
      aria-label={status}
      title={status}
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "9999px",
        background: color,
      }}
    />
  );
}

export default function RepAdminList({ items }: { items: AdminItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<{
    awaiting: boolean;
    active: boolean;
    inactive: boolean;
  }>({ awaiting: false, active: false, inactive: false });
  const [isPending, start] = useTransition();

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const anyFilter = filters.awaiting || filters.active || filters.inactive;
    return items.filter((it) => {
      const matchesQ =
        !ql ||
        it.name.toLowerCase().includes(ql) ||
        it.email.toLowerCase().includes(ql);

      const matchesFilter = !anyFilter
        ? true
        : (it.status === "awaiting" && filters.awaiting) ||
          (it.status === "active" && filters.active) ||
          (it.status === "inactive" && filters.inactive);

      return matchesQ && matchesFilter;
    });
  }, [items, q, filters]);

  async function approve(id: string) {
    start(async () => {
      const res = await fetch("/api/reps/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId: id }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error || "Failed to approve");
      } else {
        router.refresh();
      }
    });
  }

  async function setStatus(repId: string, status: "active" | "inactive") {
    const verb = status === "inactive" ? "mark this rep as INACTIVE" : "reactivate this rep";
    if (!confirm(`Are you sure you want to ${verb}?`)) return;

    start(async () => {
      const res = await fetch("/api/reps/set-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repId, status }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error || "Failed to update status");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      {/* Search + Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <input
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: "1 1 280px",
            height: 40,
            padding: "0 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={filters.awaiting}
            onChange={(e) => setFilters((f) => ({ ...f, awaiting: e.target.checked }))}
          />
          <StatusDot status="awaiting" /> <span>Awaiting approval</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={filters.active}
            onChange={(e) => setFilters((f) => ({ ...f, active: e.target.checked }))}
          />
          <StatusDot status="active" /> <span>Active</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={filters.inactive}
            onChange={(e) => setFilters((f) => ({ ...f, inactive: e.target.checked }))}
          />
          <StatusDot status="inactive" /> <span>Inactive</span>
        </label>
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((it) => (
          <div
            key={`${it.status}-${it.id}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <StatusDot status={it.status} />
              </div>
              <div style={{ fontSize: 14 }}>
                {it.email}
                {it.phone ? ` · ${it.phone}` : ""}
                {it.region_code ? ` · ${it.region_code}` : ""}
              </div>
              {it.address && <div style={{ fontSize: 14 }}>{it.address}</div>}
              {it.id_url && (
                <div style={{ marginTop: 6 }}>
                  <a href={it.id_url} target="_blank" rel="noreferrer">
                    View ID
                  </a>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {it.status === "awaiting" ? (
                <button
                  onClick={() => approve(it.id)}
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
              ) : it.status === "active" ? (
                <button
                  onClick={() => setStatus(it.id, "inactive")}
                  disabled={isPending}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontWeight: 600,
                  }}
                >
                  {isPending ? "Working…" : "Mark inactive"}
                </button>
              ) : (
                <button
                  onClick={() => setStatus(it.id, "active")}
                  disabled={isPending}
                  style={{
                    background: "#0ea5e9",
                    color: "white",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontWeight: 600,
                  }}
                >
                  {isPending ? "Working…" : "Mark active"}
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: "#6b7280", padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
            No results.
          </div>
        )}
      </div>
    </div>
  );
}
