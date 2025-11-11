"use client";

import { useEffect, useState } from "react";

export default function ContractPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = await r.json();
      setMe({ email: j.email });

      // load DocuSeal embed script
      const s = document.createElement("script");
      s.src = "https://cdn.docuseal.com/js/form.js";
      s.async = true;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    })();
  }, []);

  if (!me) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto" }}>
        <h1>Documents</h1>
        <p>Loading your info…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Documents</h1>
      <p>Complete both of the following forms:</p>

      {/* Direct Seller Agreement */}
      <section style={{ marginBottom: 50 }}>
        <h2>Direct Seller Agreement</h2>
        <docuseal-form
          url="https://docuseal.com/d/9k7XDpbubLzDho"
          email={me.email}
          style={{ display: "block", width: "100%", minHeight: 780 }}
        />
      </section>

      {/* W-9 Form */}
      <section>
        <h2>W-9 Form</h2>
        <docuseal-form
          url="https://docuseal.com/d/5gcuQfA4DStfea"
          email={me.email}
          style={{ display: "block", width: "100%", minHeight: 780 }}
        />
      </section>
    </main>
  );
}
