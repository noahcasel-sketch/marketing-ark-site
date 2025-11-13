// app/portal/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export default async function PortalPage() {
  // Supabase (server) using cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  return (
    <main style={{ maxWidth: 1100, margin: "48px auto", padding: "0 16px" }}>
      <h1 style={{ marginTop: 0 }}>Rep Portal</h1>
      <p style={{ marginTop: 4, opacity: 0.9 }}>
        {user ? <>Welcome, <strong>{user.email}</strong>.</> : <>Please sign in to access your portal.</>}
      </p>

      {/* Grid cards */}
      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "1fr",
          marginTop: 20,
        }}
      >
        {/* Today */}
        <section style={cardStyle}>
          <h2 style={cardTitle}>Today</h2>
          <ul>
            <li>Territory: TBD</li>
            <li>Installs scheduled: 0</li>
            <li>My orders this week: 0</li>
          </ul>
        </section>

        {/* Resources */}
        <section style={cardStyle}>
          <h2 style={cardTitle}>Resources</h2>
          <ul>
            <li>Sales script</li>
            <li>Product FAQs</li>
            <li>Compliance</li>
          </ul>
        </section>

        {/* Documents */}
        <section style={cardStyle}>
          <h2 style={cardTitle}>Documents</h2>
          <p>Complete your Direct Seller Agreement and W-9.</p>
          <Link
            href="/portal/contract"
            style={{
              display: "inline-block",
              background: "#ffd24a", // yellow
              color: "#111",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 700,
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            Complete Your Documents
          </Link>
        </section>
      </div>

      <style>{`
        @media (min-width: 960px) {
          div[style*="grid-template-columns: 1fr"] {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
      `}</style>

      <footer style={{ marginTop: 40, opacity: 0.7, fontSize: 14 }}>
        © 2025 Marketing-ARK LLC • Door-to-Door Fiber-Optic Sales • Phoenix, AZ
      </footer>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

const cardTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};
