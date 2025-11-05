# Marketing‑ARK Starter (Next.js + Supabase on Vercel)

**Goal:** Public marketing site with a single **Rep Login** that opens a protected **/portal**. No local installs required.

## 1) Create the Supabase project
1. Go to Supabase → New Project.
2. Copy the **Project URL** and **anon public key** (Settings → API).
3. In **Authentication → Providers**, enable **Email** sign‑in (magic link). Disable others for now.

## 2) Deploy to Vercel
1. Create a GitHub repo and upload this code.
2. In Vercel → Add New Project → Import the GitHub repo.
3. In Project → **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
4. Deploy. You'll receive a `*.vercel.app` URL.

## 3) Connect your domain (GoDaddy)
In Vercel → Domains → Add your domain. Then in GoDaddy DNS:
- **A @ → 76.76.21.21** (Vercel apex A record)
- **CNAME www → cname.vercel-dns.com.**
Delete any conflicting A/CNAME for `@` or `www` that point elsewhere.

## 4) Email magic-link redirect
In Supabase → Auth → URL Configuration:
- **Site URL**: `https://yourdomain.com`
- **Additional Redirect URLs**: `https://yourdomain.com/portal`, and your `https://yourproject.vercel.app/portal`

## 5) (Optional) Profiles table
Paste this SQL in Supabase SQL Editor:
```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users not null,
  full_name text,
  phone text,
  role text default 'rep',
  created_at timestamp with time zone default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 6) Gate access by domain (optional)
Allow only `@marketing-ark.com` emails in Supabase Auth → Policies.
