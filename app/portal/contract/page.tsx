"use client";

import React, { useEffect, useMemo, useState } from "react";

type Status = { contractSigned: boolean; w9Signed: boolean; total: number } | null;
type DocItem = { name: string; url: string; created_at: string }[];

const DSA_URL = "https://docuseal.com/d/5gcuQfA4DStfea"; // Direct Seller Agreement (typed email inside)
const W9_URL  = "https://docuseal.com/d/9k7XDpbubLzDho"; // W-9 (typed email inside)

// Static forms component - memo'd so it won't rerender while typing
const Forms = React.memo(function Forms() {
  useEffect(() => {
    // Load DocuSeal embed script exactly once
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://cdn.docuseal.com/js/form.js"]');
    if (existing) return;
    const s = document.createElement("script");
    s.src = "https://cdn.docuseal.com/js/form.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 24,
      }}
    >
      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Direct Seller Agreement</h2>
        <docuseal-form
          data-src={DSA_URL}
          style={{ display: "block", width: "100%", minHeight: 800, border: "none" }}
        ></docuseal-form>
      </section>

      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>W-9 Form</h2>
        <docuseal-form
          data-src={W9_URL}
          style={{ display: "block", width: "100%", minHeight: 800, border: "none" }}
        ></docuseal-form>
      </section>

      <style>{`
        @media (min-width: 960px) {
          div[style*="grid-template-columns: 1fr"] {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
});

export default function ContractPage() {
  const [status, setStatus] = useState<Status>(null);
  const [docs, setDocs] = useState<DocItem>([]);
  const [loading, setLoading] = useState(true);

  const badge = useMemo(() => {
    const done = status?.total ?? 0;
    const color = done >= 2 ? "#0ea75a" : "#f5c518"; // green vs yellow
    const text = `${done}/2 Completed`;
    return { color, text };
  }, [status]);

  async function refreshStatus() {
    try {
      const r = await fetch("/api/documents/status", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        setStatus(j);
      } else {
        setStatus({ contractSigned: false, w9Signed: false, total: 0 });
      }
    } catch {
      setStatus({ contractSigned: false, w9Signed: false, total: 0 });
    }
  }

  async function refreshDocs() {
    try {
      const r = await fetch("/api/documents/list", { cache: "no-store" });
      if (r.ok) setDocs(await r.json());
      else setDocs([]);
    } catch {
      setDocs([]);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([refreshStatus(), refreshDocs()]);
      setLoading(false);
    })();

    // Poll every 10s so badge updates after webhook saves
    const id = setInterval(() => {
      refreshStatus();
      refreshDocs();
    }, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ maxWidth: 1200, margin: "32px auto", padding: "0 16px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Documents</h1>
        <span
          title="Updates when your signed PDFs are saved by the webhook"
          style={{
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 999,
            fontWeight: 600,
            background: badge.color,
            color: "#111",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {badge.text}
        </span>
      </header>

      <p style={{ marginTop: 0, color: "#666" }}>
        Please complete both forms below. You’ll type your email inside each form.
      </p>

      {/* Side-by-side forms */}
      <Forms />

      {/* My Documents (download) */}
      <section style={{ marginTop: 32 }}>
        <h3>My Completed Documents</h3>
        {loading ? (
          <p>Loading…</p>
        ) : docs.length === 0 ? (
          <p>No completed documents yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {docs.map((d, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #eee" }}>
                <span>{d.name}</span>
                <span style={{ display: "inline-flex", gap: 12, alignItems: "center" }}>
                  <small style={{ color: "#777" }}>{new Date(d.created_at).toLocaleString()}</small>
                  <a href={d.url} target="_blank" rel="noreferrer" style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8 }}>
                    Download
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
