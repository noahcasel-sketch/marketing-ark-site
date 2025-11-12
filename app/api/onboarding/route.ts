import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabaseAdmin' 

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const region = (form.get('region') || '').toString() as 'ARK' | 'AKM' | 'HC'
    const managerName = (form.get('managerName') || '').toString().trim()
    const legalFirstName = (form.get('legalFirstName') || '').toString().trim()
    const legalLastName = (form.get('legalLastName') || '').toString().trim()
    const email = (form.get('email') || '').toString().trim().toLowerCase()
    const phoneRaw = (form.get('phone') || '').toString().trim()
    const birthDate = (form.get('birthDate') || '').toString().trim()
    const address = (form.get('address') || '').toString().trim()
    const idPhoto = form.get('idPhoto') as File | null

    const missing: string[] = []
    if (!region) missing.push('region')
    if (!managerName) missing.push('managerName')
    if (!legalFirstName) missing.push('legalFirstName')
    if (!legalLastName) missing.push('legalLastName')
    if (!email || !email.includes('@')) missing.push('email')
    if (!phoneRaw) missing.push('phone')
    if (!birthDate) missing.push('birthDate')
    if (!address) missing.push('address')
    if (!idPhoto) missing.push('idPhoto')
    if (missing.length) {
      return NextResponse.json({ ok: false, error: 'Missing fields', missing }, { status: 400 })
    }

    const phone = phoneRaw.replace(/\D/g, '')
    const ext = idPhoto!.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileNameSafe = `${crypto.randomUUID()}.${ext}`
    const filePath = `${region}/${fileNameSafe}`

    // Upload to private bucket
    const arrayBuffer = await idPhoto!.arrayBuffer()
    const { error: upErr } = await supabaseAdmin
      .storage.from('id-photos')
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: idPhoto!.type || 'image/jpeg',
        upsert: false
      })
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })
    }

    // INSERT into pending_reps
    const { error: insErr } = await supabaseAdmin.from('pending_reps').insert({
      region_code: region,
      legal_first_name: legalFirstName,
      legal_last_name: legalLastName,
      email,
      phone,
      address,
      id_photo_path: filePath
    })
    if (insErr) {
      // roll back upload if insert fails
      await supabaseAdmin.storage.from('id-photos').remove([filePath]).catch(() => {})
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

