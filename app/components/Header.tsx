import Link from 'next/link'
import { supabaseServer } from '../../lib/supabaseServer'


export const dynamic = 'force-dynamic'
export const revalidate = 0


const OWNER_EMAIL = 'noahcasel@marketing-ark.com'


export default async function Header() {
const supabase = supabaseServer()
const { data: { user } } = await supabase.auth.getUser()


let hasRegion = false
if (user?.email) {
const { data: region } = await supabase
.from('regions')
.select('code, name')
.eq('manager_email', user.email)
.maybeSingle()
hasRegion = !!region
}


const canSeeRegion = !!user?.email && (hasRegion || user.email === OWNER_EMAIL)
const canSeeCompany = user?.email === OWNER_EMAIL


return (
<header className="border-b bg-white/70 backdrop-blur sticky top-0 z-40">
<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
<div className="flex items-center gap-6">
<Link href="/" className="font-semibold text-lg">Marketing‑ARK</Link>
<nav className="hidden sm:flex items-center gap-4 text-sm">
<Link href="/onboarding" className="hover:underline">Onboarding</Link>
{canSeeRegion && <Link href="/region" className="hover:underline">Region</Link>}
{canSeeCompany && <Link href="/company" className="hover:underline">Company</Link>}
</nav>
</div>
<div className="flex items-center gap-3">
{!user?.email ? (
<Link href="/login" className="px-3 py-1.5 rounded-xl border">Rep Login</Link>
) : (
<>
<span className="text-sm hidden sm:inline">{user.email}</span>
<form action="/logout" method="post">
<button type="submit" className="px-3 py-1.5 rounded-xl bg-black text-white">Logout</button>
</form>
</>
)}
</div>
</div>
</header>
)
}
