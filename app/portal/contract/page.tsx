"use client";

import { useEffect, useState } from "react";

const DSA_URL = "https://docuseal.com/d/9k7XDpbubLzDho"; // Direct Seller Agreement
const W9_URL  = "https://docuseal.com/d/5gcuQfA4DStfea"; // W-9

type Me = { email: string; userId: string; name?: string } | null;

export default function ContractPage() {
  const [me, setMe] = useState<Me>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Try to fetch the signed-in user
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setMe(j);
        } else {
          setMe(null); // not logged in or route unavailable
        }
      } catch {
        setMe(null);
      }

      // Load DocuSeal embed script
      const s = document.createElement("script");
      s.src = "https://cdn.docuseal.com/js/form.js";
      s.async = true;
      s.onload = () => setReady(true);
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Documents</h1>
      {!ready && <p>Loading…</p>}

      {ready && (
        <>
          <section style={{ marginBottom: 48 }}>
            <h2>Direct Seller Agreement</h2>
            <docuseal-form
              url={DSA_URL}
              {...(me?.email ? { email: me.email } : {})}
              style={{ display: "block", width: "100%", minHeight: 780 }}
            />
          </section>

          <section>
            <h2>W-9 Form</h2>
            <docuseal-form
              url={W9_URL}
              {...(me?.email ? { email: me.email } : {})}
              style={{ display: "block", width: "100%", minHeight: 780 }}
            />
          </section>
        </>
      )}
    </main>
  );
}
