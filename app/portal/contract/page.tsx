"use client";

import { useEffect, useRef, useState } from "react";

export default function ContractPage() {
  const [ready, setReady] = useState(false);
  const [urlsReady, setUrlsReady] = useState(false);

  // We freeze the final URLs in state exactly once
  const [dsaSrc, setDsaSrc] = useState<string | null>(null);
  const [w9Src, setW9Src] = useState<string | null>(null);

  // Base DocuSeal links
  const DSA_BASE = "https://docuseal.com/d/5gcuQfA4DStfea";
  const W9_BASE  = "https://docuseal.com/d/9k7XDpbubLzDho";

  // onlyRunOnce guard
  const initialized = useRef(false);

  // 1) Load DocuSeal script once
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdn.docuseal.com/js/form.js";
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
    return () => document.body.removeChild(s);
  }, []);

  // 2) Resolve /api/me once, then freeze final URLs (with or without params)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      let email: string | undefined;
      let uid: string | undefined;

      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const me = await res.json();
          email = me?.email;
          uid = me?.userId;
        }
      } catch {
        // ignore — we’ll fall back to base URLs
      }

      const withParams = (base: string) => {
        if (!email || !uid) return base;
        const u = new URL(base);
        u.searchParams.set("email", email);
        u.searchParams.set("uid", uid);
        return u.toString();
      };

      setDsaSrc(withParams(DSA_BASE));
      setW9Src(withParams(W9_BASE));
      setUrlsReady(true);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Documents</h1>

      {!(ready && urlsReady) && <p>Loading forms…</p>}

      {ready && urlsReady && (
        <>
          <section style={{ marginBottom: 48 }}>
            <h2>Direct Seller Agreement</h2>
            {/* IMPORTANT: Do not change data-src after first render */}
            <docuseal-form
              data-src={dsaSrc!}
              style={{ display: "block", width: "100%", minHeight: 800, border: "none" }}
            ></docuseal-form>
          </section>

          <section>
            <h2>W-9 Form</h2>
            <docuseal-form
              data-src={w9Src!}
              style={{ display: "block", width: "100%", minHeight: 800, border: "none" }}
            ></docuseal-form>
          </section>
        </>
      )}
    </main>
  );
}
