"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function RegionFilter({ regions, selected }: { regions: string[]; selected: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const onChange = (val: string) => {
    const params = new URLSearchParams(sp.toString());
    if (!val || val === "ALL") params.delete("region");
    else params.set("region", val);
    router.push(`/company?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-700">Region</label>
      <select
        className="rounded border px-2 py-1 text-sm"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="ALL">All regions</option>
        {regions.map((r) => (
          <option key={r} value={r.toUpperCase()}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
