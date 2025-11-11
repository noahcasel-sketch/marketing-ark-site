"use client";

import { useEffect, useState } from "react";

export default function ContractPage() {
  const [me, setMe] = useState<{ email?: string; userId?: string } | null>(null);
  const [ready, setReady] = useState(false);

  // 1️⃣ Load user info from /api/me
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setMe({ email: data.email, userId: data.userId });
        }
      } catch (err) {
        console.warn("Failed to fetch /api/me", err);
      }
    })();
  }, []);

  // 2️⃣ Load DocuSeal script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.docuseal.com/js/form.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // 3️⃣ Helper to append ?email & ?uid to URLs
  const appendParams = (url: string) => {
    if (!me?.email || !me?.userId) return url;
    const u = new URL(url);
    u.searchParams.set("email", me.email);
    u.searchParams.set("uid", me.userId);
    return u.toString();
  };

  // 4️⃣ Final URLs
  const DSA_URL = appendParams("https://docuseal.com/d/5gcuQfA4DStfea");
  const W9_URL = appendParams("https://docuseal.com/d/9k7XDpbubLzDho");

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Documents</h1>

      {!ready && <p>Loading forms...</p>}

      {ready && (
        <>
          <section style={{ marginBottom: 48 }}>
            <h2>Direct Seller Agreement</h2>
            <docuseal-form
              data-src={DSA_URL}
              style={{
                display: "block",
                width: "100%",
                minHeight: 800,
                border: "none",
              }}
            ></docuseal-form>
          </section>

          <section>
            <h2>W-9 Form</h2>
            <docuseal-form
              data-src={W9_URL}
              style={{
                display: "block",
                width: "100%",
                minHeight: 800,
                border: "none",
              }}
            ></docuseal-form>
          </section>
        </>
      )}
    </main>
  );
}
