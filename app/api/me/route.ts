// app/api/me/route.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  // Build a Supabase server client that uses Next.js cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookies().set({ name, value, ...options });
          } catch {
            // ignore - read only in edge runtimes
          }
        },
        remove(name: string, options: any) {
          try {
            cookies().set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // ignore
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 });
  }

  const user = data.user;
  return Response.json({
    email: user.email,
    userId: user.id,
    name: (user.user_metadata as any)?.full_name ?? null,
  });
}
