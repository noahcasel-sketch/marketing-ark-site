// app/company/page.tsx
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import ResendResetButton from "../components/ResendResetButton";

export const dynamic = "force-dynamic";

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

function displayName(r: Rep) {
  const n = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
  return n || (r.email ?? r.work_email ?? "");
}
function loginEmail(r: Rep) {
  return (r.email || r.work_email || "").toLowerCase();
}

export default async function CompanyPage({
  searchParams,
}: {
  searchParams?: Record<string, string>;
}) {
  const supabase = createServerComponentClient({ cookies });

  // Build region list: prefer a "regions" table; otherwise distinct from reps
  let regions: string[] = [];
  const { data: regionRows } = await supabase
    .from("regions")
    .select("name")
    .order("name", { ascending: true });

  if (regionRows?.length) {
    regions = regionRows.map((r: any) => String(r.name).toUpperCase()).filter(Boolean);
  } else {
    const { data: distinct } = await supabase
      .from("reps")
      .select("region")
      .not("region", "is", null);
    const set = new Set<string>(
      (distinct ?? [])
        .map((r: any) => (r.region ? String(r.region).toUpperCase() : ""))
        .filter(Boolean)
    );
    regions = Array.from(set).sort();
  }

  const selectedRegion = (searchParams?.region ?? "ALL").toUpperCase();

  // Fetch reps (filter when region selected)
  let repQuery = supabase
    .from("reps")
    .select("id, first_name, last_name, email, work_email, region, active, created_at")
    .order("created_at", { ascending: false });

  if (selectedRegion !== "ALL") {
    repQuery = repQuery.eq("region", selectedRegion);
  }

  const { data: reps, error } = await repQuery;

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Company</h1>
        <p className="mt-4 text-red-600">Error: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Company</h1>

        {/* Simple server-only filter form */}
        <form className="flex items-center gap-2" method="get">
          <label className="text-sm text-gray-700">Region</label>
          <select
            name="region"
            defaultValue={selectedRegion}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="ALL">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Filter
          </button>
        </form>
      </div>

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
