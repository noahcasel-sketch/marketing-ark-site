'use client'

import { useRef, useState } from 'react'

const REGIONS = [
  { code: 'ARK', label: 'ARK' },
  { code: 'AKM', label: 'AK Marketing' },
  { code: 'HC', label: 'HC' },
] as const

type FieldName =
  | 'region'
  | 'managerName'
  | 'legalFirstName'
  | 'legalLastName'
  | 'email'
  | 'phone'
  | 'birthDate'
  | 'address'
  | 'idPhoto'

export default function OnboardingPage() {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<Set<FieldName>>(new Set())

  const refs: Record<FieldName, React.RefObject<HTMLElement & { scrollIntoView: (opts?: any) => void }>> = {
    region: useRef(null),
    managerName: useRef(null),
    legalFirstName: useRef(null),
    legalLastName: useRef(null),
    email: useRef(null),
    phone: useRef(null),
    birthDate: useRef(null),
    address: useRef(null),
    idPhoto: useRef(null),
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors(new Set())

    const formEl = e.currentTarget
    const fd = new FormData(formEl)

    const required: FieldName[] = [
      'region','managerName','legalFirstName','legalLastName','email','phone','birthDate','address','idPhoto'
    ]
    const missing: FieldName[] = []
    for (const k of required) {
      const v = fd.get(k)
      if (!v || (typeof v === 'string' && v.trim() === '')) missing.push(k)
    }

    if (missing.length) {
      const set = new Set(missing)
      setErrors(set)
      refs[missing[0]]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/onboarding', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data?.missing?.length) setErrors(new Set(data.missing))
        alert(data?.error || 'Submission failed')
        if (data?.missing?.[0]) refs[data.missing[0] as FieldName].current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      setDone(true)
      formEl.reset()
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <h1 className="text-3xl font-semibold mb-4">Submission Complete!</h1>
        <p>You will receive an email within the next 48 hours with further instruction.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Representative Onboarding</h1>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {/* Region */}
        <div ref={refs.region as any}>
          <label className="block text-sm font-medium mb-2">Region <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {REGIONS.map(r => (
              <label key={r.code} className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer ${errors.has('region') ? 'border-red-500' : 'border-gray-300'}`}>
                <input type="radio" name="region" value={r.code} className="h-4 w-4" required />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          {errors.has('region') && <p className="text-red-500 text-sm mt-1">Please select a region.</p>}
        </div>

        {/* Manager name */}
        <div ref={refs.managerName as any}>
          <label className="block text-sm font-medium mb-1">Manager Name (First & Last) <span className="text-red-500">*</span></label>
          <input name="managerName" type="text" required className={`w-full border rounded-xl p-3 ${errors.has('managerName') ? 'border-red-500' : 'border-gray-300'}`} placeholder="Jane Doe" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div ref={refs.legalFirstName as any}>
            <label className="block text-sm font-medium mb-1">Legal First Name <span className="text-red-500">*</span></label>
            <input name="legalFirstName" type="text" required className={`w-full border rounded-xl p-3 ${errors.has('legalFirstName') ? 'border-red-500' : 'border-gray-300'}`} />
          </div>
          <div ref={refs.legalLastName as any}>
            <label className="block text-sm font-medium mb-1">Legal Last Name <span className="text-red-500">*</span></label>
            <input name="legalLastName" type="text" required className={`w-full border rounded-xl p-3 ${errors.has('legalLastName') ? 'border-red-500' : 'border-gray-300'}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div ref={refs.email as any}>
            <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
            <input name="email" type="email" required className={`w-full border rounded-xl p-3 ${errors.has('email') ? 'border-red-500' : 'border-gray-300'}`} placeholder="rep@example.com" />
          </div>
          <div ref={refs.phone as any}>
            <label className="block text-sm font-medium mb-1">Phone Number <span className="text-red-500">*</span></label>
            <input name="phone" type="tel" inputMode="numeric" required className={`w-full border rounded-xl p-3 ${errors.has('phone') ? 'border-red-500' : 'border-gray-300'}`} placeholder="1234567890" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div ref={refs.birthDate as any}>
            <label className="block text-sm font-medium mb-1">Birth Date <span className="text-red-500">*</span></label>
            <input name="birthDate" type="date" required className={`w-full border rounded-xl p-3 ${errors.has('birthDate') ? 'border-red-500' : 'border-gray-300'}`} />
          </div>
        </div>

        <div ref={refs.address as any}>
          <label className="block text-sm font-medium mb-1">Street Address <span className="text-red-500">*</span></label>
          <input name="address" type="text" required className={`w-full border rounded-xl p-3 ${errors.has('address') ? 'border-red-500' : 'border-gray-300'}`} placeholder="1234 Example St, City, State 12345" />
        </div>

        <div ref={refs.idPhoto as any}>
          <label className="block text-sm font-medium mb-1">Photo of Valid ID (Driver&apos;s License or Passport) <span className="text-red-500">*</span></label>
          <input name="idPhoto" type="file" accept="image/*,application/pdf" required className={`w-full border rounded-xl p-3 ${errors.has('idPhoto') ? 'border-red-500' : 'border-gray-300'}`} />
          {errors.has('idPhoto') && <p className="text-red-500 text-sm mt-1">Please upload your ID.</p>}
        </div>

        <button type="submit" disabled={submitting} className="px-5 py-3 rounded-xl bg-black text-white disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </div>
  )
}
