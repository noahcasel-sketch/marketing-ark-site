'use client'


const { error } = await supabase.auth.signInWithOtp({
email,
options: { emailRedirectTo: redirectTo }
})
if (error) setError(error.message)
else setSent(true)
} finally {
setSending(false)
}
}


return (
<div className="max-w-md mx-auto py-16">
<h1 className="text-3xl font-semibold mb-4">Sign in</h1>


{sent ? (
<p>Check <b>{email}</b> for your sign-in link. (It can take a minute—check spam.)</p>
) : (
<form onSubmit={onSubmit} className="space-y-4">
<div>
<label className="block text-sm font-medium mb-1">Email</label>
<input
type="email"
className="w-full border rounded-xl p-3"
value={email}
onChange={(e) => setEmail(e.target.value)}
placeholder="you@marketing-ark.com"
required
/>
</div>


{error && <p className="text-red-600 text-sm">{error}</p>}


<button
type="submit"
disabled={sending}
className="px-5 py-3 rounded-xl bg-black text-white disabled:opacity-60"
>
{sending ? 'Sending…' : 'Send magic link'}
</button>
</form>
)}
</div>
)
}
