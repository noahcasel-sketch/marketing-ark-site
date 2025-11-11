"use client";

import { useEffect, useState } from "react";

export default function ContractPage() {
  const [me, setMe] = useState<{ email: string; userId: string; name?: string } | null>(null);
  const FORM_URL = "https://www.docuseal.com/s/REPLACE_WITH_FORM_ID"; // <-- paste your DocuSeal form URL here

  useEffect(() => {
    (async () => {
      // Adjust this if your /api/me shape is different
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = await r.json();
      setMe({ email: j.email, userId: j.userId, name: j.name });

      // Load DocuSeal embed script (adds <docuseal-form/> custom element)
      const s = document.createElement("script");
      s.src = "https://cdn.docuseal.com/js/form.js";
      s.async = true;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: "40px auto" }}>
      <h1>Contractor Agreement</h1>
      <p>Sign your independent contractor agreement below.</p>

      {!me ? (
        <p>Loading…</p>
      ) : (
        // The DocuSeal embed. Many forms accept an `email` attribute; keep it to help recipient mapping.
        // If your template has a required email field, this helps prefill it.
        <docuseal-form
          url={FORM_URL}
          email={me.email}
          style={{ display: "block", width: "100%", minHeight: 780 }}
        />
      )}
    </main>
  );
}
