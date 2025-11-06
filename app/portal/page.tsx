export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from "../../lib/supabaseServer";
import Link from "next/link";

export default async function PortalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto" }}>
        <div className="card">
          <h2>Access denied</h2>
          <p>Please <Link href="/login">log in</Link> to view your rep portal.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: "32px auto" }}>
      <h1>Rep Portal</h1>
      <p style={{ color: "var(--muted)" }}>Welcome, {user.email}.</p>
      <section className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Today</h3>
          <ul>
            <li>Territory: TBD</li>
            <li>Installs scheduled: 0</li>
            <li>My orders this week: 0</li>
          </ul>
        </div>
        <div className="card">
          <h3>Resources</h3>
          <ul>
            <li><a href="#">Sales script</a></li>
            <li><a href="#">Product FAQs</a></li>
            <li><a href="#">Compliance</a></li>
          </ul>
        </div>
        <div className="card">
          <form action="/logout" method="post">
            <button className="btn" type="submit">Log out</button>
          </form>
        </div>
      </section>
    </main>
  );
}
