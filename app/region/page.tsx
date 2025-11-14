// app/region/page.tsx
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import ResendResetButton from "../components/ResendResetButton";

export const dynamic = "force-dynamic";

type Rep = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  work_email?: string | null;
  region?: string | null;
  active?: boolean | null;
};

function displayName(r: Rep) {
  const n = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
  return n || (r.email ?? r.work_email ?? "");
}
function loginEmail(r: Rep) {
  return (r.email || r.work_email || "").toLowerCase();
}

export default async function RegionPage() {
  const supabase = createServerComponentClient({ cookies });

  // Who is signed in?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user?.email?.toLowerCase();

  // Base query
  let query = supabase
    .from("reps")
    .select("id, first_name, last_name, email, work_email, region, active")
    .order("created_at", { ascending: false });

  // Owner Noah: only see ARK region
  if (me === "noahcasel@marketing-ark.com") {
    query = query.eq("region", "ARK");
  }
  // For other region managers, your existing RLS/policies should scope results as needed.

  const { data: reps, error } = await query;

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Region</h1>
        <p className="mt-4 text-red-600">Error: {error.message}</p>
      </main>
    );
  }

  const regionLabel =
    me === "noahcasel@marketing-ark.com" ? "ARK (owner view)" : "Your region";

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Region — {regionLabel}</h1>

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
            {(reps as Rep[] | null)?.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{displayName(r)}</td>
                <td className="px-3 py-2">{loginEmail(r)}</td>
                <td className="px-3 py-2">{(r.region ?? "").toString().toUpperCase()}</td>
                <td className="px-3 py-2">
                  {r.active ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    {/* Your existing "Mark Inactive" button/component goes ABOVE this line */}
                    <ResendResetButton email={loginEmail(r)} />
                  </div>
                </td>
              </tr>
            )) ?? null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
