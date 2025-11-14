"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ResendResetButton from "../components/ResendResetButton";

type Rep = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  work_email?: string | null;
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

export default function RegionPage() {
  const [me, setMe] = useState<string | null>(null);
  const [reps, setReps] = useState<Rep[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        // get signed-in user (client)
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const email = userData.user?.email?.toLowerCase() ?? null;
        if (!cancelled) setMe(email);

        // Base query
        let query = supabase
          .from("reps")
          .select("id, first_name, last_name, email, work_email, region, active, created_at")
          .order("created_at", { ascending: false });

        // Owner Noah: only see ARK region
        if (email === "noahcasel@marketing-ark.com") {
          query = query.eq("region", "ARK");
        }
        // For other region managers, rely on your RLS to scope appropriately.

        const { data, error } = await query;
        if (error) throw error;

        if (!cancelled) setReps(data as Rep[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load region data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const regionLabel = useMemo(() => {
    return me === "noahcasel@marketing-ark.com" ? "ARK (owner view)" : "Your region";
  }, [me]);

  const body = useMemo(() => {
    if (loading) return <p className="text-sm text-gray-600">Loading…</p>;
    if (err) return <p className="text-sm text-red-600">Error: {err}</p>;
    if (!reps || reps.length === 0) return <p className="text-sm text-gray-600">No reps found.</p>;

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
      <h1 className="text-2xl font-semibold">Region — {regionLabel}</h1>
      {body}
    </main>
  );
}
