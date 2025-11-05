import { redirect } from "next/navigation";
import InviteForm from "./InviteForm";
import { createClient } from "../../lib/supabaseServer";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Must be logged in
  if (!user?.email) redirect("/login");

  // Check allowlist from env (server can read process.env)
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!admins.includes(user.email.toLowerCase())) {
    redirect("/portal"); // or "/login"
  }

  return (
    <main style={{ maxWidth: 520, margin: "64px auto" }}>
      <h1>Invite Reps</h1>
      <p>Only admins can access this page.</p>
      {/* Pass the current admin email so the API route can verify */}
      <InviteForm adminEmail={user.email} />
    </main>
  );
}
