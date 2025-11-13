// app/page.tsx
export default function HomePage() {
  return (
    <main style={{ padding: "32px 0" }}>
      {/* HERO */}
      <section className="hero" style={{ margin: "0 auto", maxWidth: 980 }}>
        <h1 style={{ fontSize: 48, margin: 0, lineHeight: 1.1 }}>
          Build your sales career with Marketing-ARK
        </h1>
        <p style={{ fontSize: 18, opacity: 0.85, marginTop: 12, maxWidth: 720 }}>
          We partner with leading fiber-optic ISPs to bring fast, reliable internet to local
          communities. Our door-to-door reps earn industry-leading commissions with transparent
          payouts and growth paths.
        </p>
        {/* Per your request: no hero buttons here; login stays in the top-right header */}
      </section>

      {/* TRUST STRIP (no explicit background) */}
      <section style={{ padding: "28px 0" }}>
        <div className="grid" style={{ gap: 16, margin: "0 auto", maxWidth: 980 }}>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 16, backdropFilter: "saturate(1)" }}>
            <h3 style={{ marginBottom: 6 }}>Field-tested training</h3>
            <p style={{ opacity: 0.8 }}>Short ramp, ride-alongs, and daily roleplays.</p>
          </div>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 6 }}>Earnings with upside</h3>
            <p style={{ opacity: 0.8 }}>Commission-only with clear ladders and bonuses.</p>
          </div>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 6 }}>Real-world impact</h3>
            <p style={{ opacity: 0.8 }}>Bring fiber to neighborhoods that need it.</p>
          </div>
        </div>
      </section>

      {/* METRICS STRIP (no explicit background) */}
      <section style={{ padding: "8px 0 32px" }}>
        <div className="grid" style={{ gap: 12, margin: "0 auto", maxWidth: 980 }}>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 24 }}>$1.8k–2.2k</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Avg weekly new hire</div>
          </div>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 24 }}>$2.5k–5k</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Above-avg weekly</div>
          </div>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 24 }}>Transparent</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Payouts & holds</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (no explicit background) */}
      <section style={{ padding: "8px 0 36px" }}>
        <div className="grid" style={{ gap: 16, margin: "0 auto", maxWidth: 980 }}>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600 }}>1) Learn the system</div>
            <p style={{ opacity: 0.8, marginTop: 6 }}>Scripts, objection handling, neighborhoods.</p>
          </div>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600 }}>2) Knock with a mentor</div>
            <p style={{ opacity: 0.8, marginTop: 6 }}>Shadow, ride-alongs, live feedback.</p>
          </div>
          <div className="card" style={{ border: "1px solid #e5e7eb33", borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600 }}>3) Close & grow</div>
            <p style={{ opacity: 0.8, marginTop: 6 }}>Stack wins → lead a team.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
