import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <h1 style={{ fontSize: 48, margin: 0, lineHeight: 1.1 }}>
          Build your sales career with Marketing-ARK
        </h1>
        <p style={{ fontSize: 18, color: "var(--muted)", marginTop: 12, maxWidth: 720 }}>
          We partner with leading fiber-optic ISPs to bring fast, reliable internet to local communities. Our
          door-to-door reps earn industry-leading commissions with transparent payouts and growth paths.
        </p>
        {/* per your request: no hero buttons here; keep login in top-right only */}
      </section>

      {/* INVITE / TRUST STRIP */}
      <section style={{ padding: "36px 0", background: "white" }}>
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Field-tested training</h3>
            <p style={{ color: "var(--muted)" }}>Short ramp, ride-alongs, and daily roleplays.</p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Earnings with upside</h3>
            <p style={{ color: "var(--muted)" }}>Commission-only with clear ladders and bonuses.</p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Real-world impact</h3>
            <p style={{ color: "var(--muted)" }}>Bring fiber to neighborhoods that need it.</p>
          </div>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section style={{ padding: "8px 0 40px", background: "var(--surface)" }}>
        <div className="grid" style={{ gap: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 24 }}>$1.8k–2.2k</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Avg weekly new hire</div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 24 }}>$2.5k–5k</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Above-avg weekly</div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 24 }}>Transparent</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Payouts & holds</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "36px 0", background: "white" }}>
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 600 }}>1) Learn the system</div>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>Scripts, objection handling, neighborhoods.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600 }}>2) Knock with a mentor</div>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>Shadow, ride-alongs, live feedback.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600 }}>3) Close & grow</div>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>Stack wins → lead a team.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
