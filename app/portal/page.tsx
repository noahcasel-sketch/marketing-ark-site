// app/portal/page.tsx
import { supabaseServer } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortalPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Rep Portal</h1>
        <p>Please <a href="/login">log in</a> to view this page.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "48px auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Rep Portal</h1>
      <p style={{ marginBottom: 20 }}>Welcome, <strong>{user.email}</strong>.</p>

      <section style={{ border: "1px solid #1f2937", borderRadius: 14, padding: 16, marginBottom: 20, background: "#0b1220" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Today</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Territory: TBD</li>
          <li>Installs scheduled: 0</li>
          <li>My orders this week: 0</li>
        </ul>
      </section>

      <section style={{ border: "1px solid #1f2937", borderRadius: 14, padding: 16, background: "#0b1220" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Resources</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Sales script</li>
          <li>Product FAQs</li>
          <li>Compliance</li>
        </ul>
      </section>
    </main>
  );
}
