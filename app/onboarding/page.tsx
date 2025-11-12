'use client'

import { useRef, useState } from 'react'

const REGIONS = [
  { code: 'ARK', label: 'ARK' },
  { code: 'AKM', label: 'AK Marketing' },
  { code: 'HC',  label: 'HC' },
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

  const refs: Record<FieldName, React.RefObject<HTMLElement>> = {
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
      const first = missing[0]
      const el = refs[first]?.current as any
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/onboarding', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data?.missing?.length) setErrors(new Set(data.missing))
        alert(data?.error || 'Submission failed')
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
      <div className="container" style={{ paddingTop: 80 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16 }}>Submission Complete!</h1>
          <p>You will receive an email within the next 48 hours with further instruction.</p>
        </div>
      </div>
    )
  }

  const errStyle = (name: FieldName): React.CSSProperties =>
    ({ borderColor: errors.has(name) ? '#ff6b6b' : '#2a3552' })

  return (
    <div className="container" style={{ paddingTop: 80 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>Representative Onboarding</h1>

        <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 20 }}>
          {/* Region */}
          <div ref={refs.region}>
            <label className="label">Region <span style={{ color: '#ff6b6b' }}>*</span></label>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {REGIONS.map(r => (
                <label key={r.code} style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
                }}>
                  <input type="radio" name="region" value={r.code} />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
            {errors.has('region') && (
              <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>
                Please select a region.
              </div>
            )}
          </div>

          {/* Two-column grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            <div ref={refs.managerName}>
              <label className="label">Manager Name (First &amp; Last) <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="managerName" type="text" className="input" style={errStyle('managerName')} placeholder="Jane Doe" />
            </div>

            <div ref={refs.legalFirstName}>
              <label className="label">Legal First Name <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="legalFirstName" type="text" className="input" style={errStyle('legalFirstName')} />
            </div>

            <div ref={refs.legalLastName}>
              <label className="label">Legal Last Name <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="legalLastName" type="text" className="input" style={errStyle('legalLastName')} />
            </div>

            <div ref={refs.email}>
              <label className="label">Email <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="email" type="email" className="input" style={errStyle('email')} placeholder="rep@example.com" />
            </div>

            <div ref={refs.phone}>
              <label className="label">Phone Number <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="phone" type="tel" className="input" style={errStyle('phone')} placeholder="1234567890" />
            </div>

            <div ref={refs.birthDate}>
              <label className="label">Birth Date <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="birthDate" type="date" className="input" style={errStyle('birthDate')} />
            </div>

            <div style={{ gridColumn: '1 / -1' }} ref={refs.address}>
              <label className="label">Street Address <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="address" type="text" className="input" style={errStyle('address')} placeholder="1234 Example St, City, ST 12345" />
            </div>

            <div style={{ gridColumn: '1 / -1' }} ref={refs.idPhoto}>
              <label className="label">Photo of Valid ID (Driver&apos;s License or Passport) <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input name="idPhoto" type="file" className="input" style={errStyle('idPhoto')} accept="image/*,application/pdf" />
              {errors.has('idPhoto') && (
                <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>
                  Please upload your ID.
                </div>
              )}
            </div>
          </div>

          <div>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
