"use client";

import { useEffect, useState } from "react";

export default function ContractPage() {
  const [me, setMe] = useState<{ email: string; userId: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (r.ok) setMe(await r.json());
      } catch {}
      const s = document.createElement("script");
      s.src = "https://cdn.docuseal.com/js/form.js";
      s.async = true;
      s.onload = () => setReady(true);
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    })();
  }, []);

  const appendParams = (base: string) => {
    if (!me) return base;
    const u = new URL(base);
    u.searchParams.set("email", me.email);
    u.searchParams.set("uid", me.userId);
    return u.toString();
  };

  const DSA_URL = appendParams("https://docuseal.com/d/5gcuQfA4DStfea");
  const W9_URL  = appendParams("https://docuseal.com/d/9k7XDpbubLzDho");

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Documents</h1>
      {!ready && <p>Loading…</p>}

      {ready && (
        <>
          <section style={{ marginBottom: 48 }}>
            <h2>Direct Seller Agreement</h2>
            <docuseal-form
              data-src={DSA_URL}
              style={{ display: "block", width: "100%", minHeight: 780 }}
            ></docuseal-form>
          </section>

          <section>
            <h2>W-9 Form</h2>
            <docuseal-form
              data-src={W9_URL}
              style={{ display: "block", width: "100%", minHeight: 780 }}
            ></docuseal-form>
          </section>
        </>
      )}
    </main>
  );
}
