import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <h1 style={{ fontSize: 48, margin: 0, lineHeight: 1.1 }}>Build your sales career with Marketing‑ARK</h1>
        <p style={{ fontSize: 18, color: "var(--muted)", marginTop: 12, maxWidth: 720 }}>
          We partner with leading fiber‑optic ISPs to bring fast, reliable internet to local communities. Our
          door‑to‑door reps earn industry‑leading commissions with transparent payouts and growth paths.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <Link href="#about" className="btn">Learn More</Link>
          <Link href="/login" className="btn" style={{ background: "#7ee787" }}>Rep Login</Link>
        </div>
      </section>

      <section id="about" className="grid">
        <div className="card">
          <h3>What we do</h3>
          <p>Neighborhood‑based outreach, consultative sales, and post‑sale support to ensure frictionless installs.</p>
        </div>
        <div className="card">
          <h3>Why join</h3>
          <p>Independent contractor W‑9, commission‑only, weekly top performers earn $2.5k—$5k; new hires average $1.8k—$2.2k.</p>
        </div>
        <div className="card">
          <h3>Where we operate</h3>
          <p>Territories vary by state and season. Travel may be available depending on quotas and location.</p>
        </div>
        <div className="card">
          <h3>Contact</h3>
          <p>Email: ops@marketing-ark.com</p>
        </div>
      </section>
    </main>
  );
}
