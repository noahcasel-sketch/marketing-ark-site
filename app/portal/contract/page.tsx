"use client";

import { useEffect } from "react";

export default function ContractPage() {
  useEffect(() => {
    // Load the DocuSeal script
    const script = document.createElement("script");
    script.src = "https://cdn.docuseal.com/js/form.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Documents</h1>
      <p>Please complete both of the following forms:</p>

      {/* Direct Seller Agreement */}
      <section style={{ marginTop: 40, marginBottom: 60 }}>
        <h2>Direct Seller Agreement</h2>
        <docuseal-form
          data-src="https://docuseal.com/d/5gcuQfA4DStfea"
          style={{ display: "block", width: "100%", minHeight: 780 }}
        ></docuseal-form>
      </section>

      {/* W-9 Form */}
      <section>
        <h2>W-9 Form</h2>
        <docuseal-form
          data-src="https://docuseal.com/d/9k7XDpbubLzDho"
          style={{ display: "block", width: "100%", minHeight: 780 }}
        ></docuseal-form>
      </section>
    </main>
  );
}
