import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Marketing‑ARK",
  description: "Fiber‑optic sales | Rep Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <nav className="nav">
            <div className="brand">
              <span className="logo" aria-hidden />
              <Link href="/">Marketing‑ARK</Link>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/login" className="btn">Rep Login</Link>
            </div>
          </nav>
          {children}
          <footer className="footer">
            © {new Date().getFullYear()} Marketing‑ARK LLC • Door‑to‑Door Fiber‑Optic Sales • Phoenix, AZ
          </footer>
        </div>
      </body>
    </html>
  );
}
