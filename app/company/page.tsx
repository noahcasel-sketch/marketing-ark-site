"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ResendResetButton from "../components/ResendResetButton";

type Rep = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;       // login email
  work_email?: string | null;  // if stored separately
  region?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

function displayName(r: Rep) {
  const n = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
  return n || (r.email ?? r.work_email ?? "");
}
function loginEmail(r: Rep) {
  return (r.email || r.work_email || "").toLowerCase();
}

export default function CompanyPage() {
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [reps, setReps] = useState<Rep[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Load regions (prefer regions table; fallback to distinct from reps)
  useEffect(() => {
    let cancelled = false;

    const loadRegions = async () => {
      try {
        // Try dedicated regions table
        const { data: regionRows, error: regErr } = await supabase
          .from("regions")
          .select("name")
          .order("name", { ascending: true });

        if (!regErr && regionRows && regionRows.length > 0) {
          if (!cancelled) {
            setRegions(
              regionRows
                .map((r: any) => String(r.name).toUpperCase())
                .filter(Boolean),
            );
          }
          return;
        }

        // Fallback: derive from reps
        const { data: repsRows, error: repsErr } = await supabase
          .from("reps")
          .select("region");

        if (repsErr) throw repsErr;

        const set = new Set<string>(
          (repsRows ?? [])
            .map((r: any) => (r.region ? String(r.region).toUpperCase() : ""))
            .filter(Boolean),
        );
        if (!cancelled) setRegions(Array.from(set).sort());
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load regions");
      }
    };

    loadRegions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load reps (with optional region filter)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    const loadReps = async () => {
      try {
        let query = supabase
          .from("reps")
          .select("id, first_name, last_name, email, work_email, region, active, created_at")
          .order("created_at", { ascending: false });

        if (selectedRegion !== "ALL") {
          query = query.eq("region", selectedRegion);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setReps(data as Rep[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load reps");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReps();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion]);

  const body = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-gray-600">Loading…</p>;
    }
    if (err) {
      return <p className="text-sm text-red-600">Error: {err}</p>;
    }
    if (!reps || reps.length === 0) {
      return <p className="text-sm text-gray-600">No reps found.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Region</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reps.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{displayName(r)}</td>
                <td className="px-3 py-2">{loginEmail(r)}</td>
                <td className="px-3 py-2">{(r.region ?? "").toString().toUpperCase()}</td>
                <td className="px-3 py-2">
                  {r.active ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">Active</span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">Inactive</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    {/* Your "Mark Inactive" button/component goes ABOVE this line */}
                    <ResendResetButton email={loginEmail(r)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [loading, err, reps]);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Company</h1>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Region</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="ALL">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {body}
    </main>
  );
}
