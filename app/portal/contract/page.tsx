"use client";

import { useEffect, useRef, useState } from "react";

export default function ContractPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [booted, setBooted] = useState(false);

  const DSA_BASE = "https://docuseal.com/d/5gcuQfA4DStfea"; // Direct Seller Agreement
  const W9_BASE  = "https://docuseal.com/d/9k7XDpbubLzDho"; // W-9

  // 1) Ensure DocuSeal script exists (only once per page load)
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://cdn.docuseal.com/js/form.js"]');
    if (existing) {
      setBooted(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.docuseal.com/js/form.js";
    s.async = true;
    s.onload = () => setBooted(true);
    document.head.appendChild(s);
  }, []);

  // 2) After script is ready, build the final HTML exactly once
  useEffect(() => {
    if (!booted || !containerRef.current) return;

    (async () => {
      let email: string | undefined;
      let uid: string | undefined;

      // Try to get /api/me for hidden prefill; ignore errors
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          email = j?.email;
          uid = j?.userId;
        }
      } catch {/* ignore */}

      const addParams = (base: string) => {
        if (!email || !uid) return base;
        const u = new URL(base);
        u.searchParams.set("email", email);
        u.searchParams.set("uid", uid);
        return u.toString();
      };

      const dsaUrl = addParams(DSA_BASE);
      const w9Url  = addParams(W9_BASE);

      // Inject the exact embed markup DocuSeal expects.
      containerRef.current!.innerHTML = `
        <section style="margin-bottom:48px">
          <h2>Direct Seller Agreement</h2>
          <docuseal-form
            data-src="${dsaUrl}"
            style="display:block;width:100%;min-height:800px;border:none"
          ></docuseal-form>
        </section>

        <section>
          <h2>W-9 Form</h2>
          <docuseal-form
            data-src="${w9Url}"
            style="display:block;width:100%;min-height:800px;border:none"
          ></docuseal-form>
        </section>
      `;
    })();
  }, [booted]);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Documents</h1>
      {!booted && <p>Loading forms…</p>}
      <div ref={containerRef} />
    </main>
  );
}
