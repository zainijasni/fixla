'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface Category {
  id: string
  name_ms: string
  slug: string
  subcategories: { id: string; name_ms: string }[]
}

// ── Preset masalah ikut kategori ──────────────────────────────
const PRESETS: Record<string, string[]> = {
  aircond:    ['Tak sejuk', 'Air menitis / bocor', 'Bunyi bising', 'Tak nak on', 'Nak service / cuci', 'Bau busuk'],
  electrical: ['Trip / blackout', 'Lampu tak menyala', 'Soket rosak / terbakar', 'Kipas tak berpusing', 'Pasang lampu / kipas baru', 'Wayar terdedah'],
  plumbing:   ['Paip bocor', 'Tandas tersumbat', 'Sinki air lambat', 'Shower / paip rosak', 'Paip pecah', 'Flush tak jalan'],
  appliance:  ['Peti sejuk tak sejuk', 'Mesin basuh tak pusing', 'TV rosak', 'Water heater problem', 'Microwave tak panas', 'Oven rosak'],
  'it-tech':  ['WiFi lambat / tak connect', 'Laptop / PC rosak', 'Kena virus / malware', 'Setup router / network', 'Data recovery', 'Printer rosak'],
  handyman:   ['Pasang TV wall mount', 'Pintu / tingkap tak boleh tutup', 'Tukar kunci / tambah kunci', 'Repair dinding / plaster', 'Pasang perabot', 'Tangga / railing goyang'],
}

const CATEGORY_ICON: Record<string, string> = {
  electrical: '⚡', aircond: '❄️', plumbing: '🔧',
  appliance: '📺', 'it-tech': '💻', handyman: '🏠'
}

const MY_STATES = [
  'Johor','Kedah','Kelantan','Melaka','Negeri Sembilan',
  'Pahang','Perak','Perlis','Pulau Pinang','Sabah',
  'Sarawak','Selangor','Terengganu','W.P. Kuala Lumpur',
  'W.P. Labuan','W.P. Putrajaya'
]

const STATE_COORDS: Record<string, [number, number]> = {
  'Johor':[1.4854,103.7618],'Kedah':[6.1184,100.3685],
  'Kelantan':[6.1254,102.2381],'Melaka':[2.1896,102.2501],
  'Negeri Sembilan':[2.7258,101.9424],'Pahang':[3.8126,103.3256],
  'Perak':[4.5921,101.0901],'Perlis':[6.4449,100.1983],
  'Pulau Pinang':[5.4141,100.3288],'Sabah':[5.9788,116.0753],
  'Sarawak':[1.5533,110.3592],'Selangor':[3.0738,101.5183],
  'Terengganu':[5.3117,103.1324],'W.P. Kuala Lumpur':[3.1390,101.6869],
  'W.P. Labuan':[5.2831,115.2308],'W.P. Putrajaya':[2.9264,101.6964],
}

const STEP_LABELS = ['Masalah', 'Lokasi & Masa']

const StepBar = ({ current }: { current: number }) => (
  <div className="flex items-center mb-6">
    {STEP_LABELS.map((label, i) => {
      const step = i + 1
      const done = current > step
      const active = current === step
      return (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
              ${done ? 'bg-green-500 text-white' : active ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
              style={active ? { background: 'linear-gradient(135deg,#F97316,#EA6C0A)' } : {}}>
              {done ? '✓' : step}
            </div>
            <span className={`text-xs font-bold ${active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
          </div>
          {step < 2 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
        </div>
      )
    })}
  </div>
)

export default function PostJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()

  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1
  const [categoryId, setCategoryId] = useState('')
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState('')
  const [detailText, setDetailText] = useState('')

  // Step 2 — Lokasi
  const [houseStreet, setHouseStreet] = useState('')  // e.g. "No 12, Jalan Mawar"
  const [area, setArea] = useState('')                // auto-detected area/suburb
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [gpsLat, setGpsLat] = useState<number | null>(null)
  const [gpsLng, setGpsLng] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')

  // Combined address for API
  const buildAddress = () => [houseStreet.trim(), area.trim()].filter(Boolean).join(', ')

  // Step 2 — Masa
  const [urgency, setUrgency] = useState<'urgent' | 'normal' | 'flexible'>('normal')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')

  const customRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'customer') { router.push('/provider/dashboard'); return }
    api.get('/api/categories').then(({ data }) => {
      setCategories(data.categories || [])
      const slug = searchParams.get('category')
      if (slug) {
        const found = (data.categories || []).find((c: Category) => c.slug === slug)
        if (found) setCategoryId(found.id)
      }
    }).catch(() => {})
  }, [user, router, searchParams])

  const selectedCategory = categories.find(c => c.id === categoryId)
  const presets = selectedCategory ? (PRESETS[selectedCategory.slug] || []) : []

  // Reset presets bila tukar kategori
  const handleCategoryChange = (id: string) => {
    setCategoryId(id)
    setSelectedPresets([])
    setShowCustomInput(false)
    setCustomText('')
    setDetailText('')
    setErrors(p => ({ ...p, categoryId: '', description: '' }))
  }

  const togglePreset = (preset: string) => {
    setErrors(p => ({ ...p, description: '' }))
    setSelectedPresets(prev =>
      prev.includes(preset) ? prev.filter(p => p !== preset) : [...prev, preset]
    )
  }

  const handleLainLain = () => {
    setShowCustomInput(true)
    setTimeout(() => customRef.current?.focus(), 100)
  }

  // Gabung preset + custom jadi description
  const buildDescription = () => {
    const parts = [...selectedPresets]
    if (customText.trim()) parts.push(customText.trim())
    return parts.join(', ')
  }

  const detectLocation = () => {
    setLocError('')
    if (!navigator.geolocation) { setLocError('Browser tidak support GPS'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setGpsLat(latitude)
        setGpsLng(longitude)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ms`
          )
          const geo = await res.json()
          const addr = geo.address || {}
          const suburb = addr.suburb || addr.village || addr.neighbourhood || ''
          const town = addr.city || addr.town || addr.county || ''
          // Fill detected area (suburb + town) — user still types house/street manually
          setArea([suburb, town].filter(Boolean).join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
          setCity(town)
          setPostcode(addr.postcode || '')
          const negeri = MY_STATES.find(s =>
            (addr.state || '').toLowerCase().includes(s.toLowerCase().replace('w.p. ', ''))
          ) || ''
          setState(negeri)
        } catch {
          setArea(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        }
        setLocating(false)
        setErrors(p => ({ ...p, houseStreet: '', state: '' }))
      },
      () => { setLocError('Gagal detect lokasi. Sila taip manual.'); setLocating(false) }
    )
  }

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!categoryId) e.categoryId = 'Pilih kategori servis'
    if (!buildDescription()) e.description = 'Pilih sekurang-kurangnya 1 masalah atau terangkan masalah anda'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    if (!houseStreet.trim()) e.houseStreet = 'No. rumah / nama jalan diperlukan'
    if (!state) e.state = 'Pilih negeri'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2)
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return
    setApiError('')
    setLoading(true)
    const baseDesc = buildDescription()
    const description = detailText.trim() ? `${baseDesc}\n\n${detailText.trim()}` : baseDesc
    const [lat, lng] = (gpsLat && gpsLng) ? [gpsLat, gpsLng] : (STATE_COORDS[state] || [3.1390, 101.6869])
    const locationAddress = buildAddress() || area || state
    try {
      const payload: Record<string, unknown> = {
        category_id: categoryId,
        title: baseDesc.length > 60 ? baseDesc.substring(0, 57) + '...' : baseDesc,
        description,
        location_address: locationAddress,
        location_lat: lat,
        location_lng: lng,
        state,
        city: city.trim() || state,
        postcode: postcode.trim() || '00000',
        urgency,
      }
      if (preferredDate) payload.preferred_date = preferredDate
      if (preferredTime) payload.preferred_time = preferredTime

      const { data } = await api.post('/api/jobs', payload)
      router.push(`/jobs/${data.job.id}?posted=1`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setApiError(e?.response?.data?.error?.message || 'Gagal post job. Cuba semula.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1565C0] focus:bg-white transition-all font-medium"
  const labelClass = "block text-xs font-black text-gray-500 uppercase tracking-widest mb-2"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-10 pb-16">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => step > 1 ? setStep(1) : router.push('/')}
            className="text-white/70 text-sm font-bold flex items-center gap-1 hover:text-white transition">
            ← {step > 1 ? 'Kembali' : 'Utama'}
          </button>
          <button onClick={() => router.push('/')}>
            <img src="/logo.png" alt="Fixla" className="h-8 w-auto"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.5))' }} />
          </button>
        </div>
        <h1 className="text-white font-black text-2xl">Post Job</h1>
        <p className="text-blue-200 text-xs mt-1">Technician berdekatan akan hubungi anda</p>
      </div>

      <div className="px-5 -mt-8 pb-8">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <StepBar current={step} />

          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl mb-4">
              {apiError}
            </div>
          )}

          {/* ── STEP 1: Masalah ── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Kategori */}
              <div>
                <label className={labelClass}>Jenis Servis</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => {
                    const selected = categoryId === cat.id
                    return (
                      <button key={cat.id} type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all active:scale-95
                          ${selected ? 'border-[#1565C0] bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                        <span className="text-xl">{CATEGORY_ICON[cat.slug] || '🔨'}</span>
                        <span className={`text-xs font-black flex-1 leading-tight ${selected ? 'text-[#1565C0]' : 'text-gray-700'}`}>
                          {cat.name_ms}
                        </span>
                        {selected && <span className="text-[#1565C0] text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
                {errors.categoryId && <p className="text-red-500 text-xs mt-1 ml-1">{errors.categoryId}</p>}
              </div>

              {/* Preset masalah */}
              {selectedCategory && (
                <div>
                  <label className={labelClass}>Apa masalah anda?</label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map(preset => {
                      const active = selectedPresets.includes(preset)
                      return (
                        <button key={preset} type="button" onClick={() => togglePreset(preset)}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95
                            ${active
                              ? 'border-[#F97316] bg-orange-50 text-[#F97316]'
                              : 'border-slate-200 bg-slate-50 text-gray-600 hover:border-slate-300'}`}>
                          {active ? '✓ ' : ''}{preset}
                        </button>
                      )
                    })}

                    {/* Lain-lain button */}
                    <button type="button" onClick={handleLainLain}
                      className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95
                        ${showCustomInput
                          ? 'border-[#F97316] bg-orange-50 text-[#F97316]'
                          : 'border-dashed border-slate-300 bg-white text-gray-400 hover:border-slate-400'}`}>
                      + Lain-lain
                    </button>
                  </div>

                  {/* Custom textarea — muncul bila klik Lain-lain */}
                  {showCustomInput && (
                    <div className="mt-3">
                      <textarea
                        ref={customRef}
                        value={customText}
                        onChange={e => { setCustomText(e.target.value); setErrors(p => ({ ...p, description: '' })) }}
                        placeholder="Terangkan masalah anda dengan lebih lanjut..."
                        rows={3}
                        className={`${inputClass} resize-none mt-1`}
                      />
                    </div>
                  )}

                  {/* Preview gabungan */}
                  {(selectedPresets.length > 0 || customText.trim()) && (
                    <div className="mt-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                      <p className="text-xs text-gray-400 font-semibold mb-1">Masalah yang dipilih:</p>
                      <p className="text-sm text-gray-700 font-medium">{buildDescription()}</p>
                    </div>
                  )}

                  {errors.description && <p className="text-red-500 text-xs mt-1 ml-1">{errors.description}</p>}

                  {/* Optional detail box — appears once at least 1 problem selected */}
                  {(selectedPresets.length > 0 || showCustomInput) && (
                    <div className="mt-3">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                        Detail Tambahan <span className="normal-case font-normal text-gray-400">(pilihan)</span>
                      </label>
                      <textarea
                        value={detailText}
                        onChange={e => setDetailText(e.target.value)}
                        placeholder="Ceritakan lebih lanjut tentang masalah anda... (cth: dah berapa lama, bila mula berlaku, cuba baiki sendiri?)"
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  )}
                </div>
              )}

              {!selectedCategory && (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">👆 Pilih jenis servis dahulu</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Lokasi & Masa ── */}
          {step === 2 && (
            <div className="space-y-5">

              {/* Lokasi */}
              <div className="space-y-3">
                <label className={labelClass}>Lokasi Servis</label>

                {/* House / Street — required, user must type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    No. Rumah &amp; Nama Jalan <span className="text-red-400">*</span>
                  </label>
                  <input value={houseStreet}
                    onChange={e => { setHouseStreet(e.target.value); setErrors(p => ({ ...p, houseStreet: '' })) }}
                    placeholder="cth: No 12, Jalan Mawar, Taman Maju"
                    className={inputClass} />
                  {errors.houseStreet && <p className="text-red-500 text-xs mt-1 ml-1">{errors.houseStreet}</p>}
                </div>

                {/* GPS detect */}
                <button type="button" onClick={detectLocation} disabled={locating}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-black transition disabled:opacity-60
                    ${area ? 'border-green-400 text-green-600 bg-green-50' : 'border-[#1565C0] text-[#1565C0] hover:bg-blue-50'}`}>
                  {locating ? (
                    <><div className="w-4 h-4 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" /> Mengesan lokasi...</>
                  ) : area ? (
                    <>✅ Lokasi dikesan — Tap untuk tukar</>
                  ) : (
                    <>📍 Detect Kawasan Saya (GPS)</>
                  )}
                </button>
                {locError && <p className="text-red-500 text-xs ml-1">{locError}</p>}

                {/* Detected area (auto-fill, editable) */}
                {area && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Kawasan / Taman</label>
                    <input value={area} onChange={e => setArea(e.target.value)}
                      placeholder="cth: Taman Maju, Kuala Lumpur"
                      className={inputClass} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select value={state} onChange={e => { setState(e.target.value); setErrors(p => ({ ...p, state: '' })) }}
                      className={inputClass}>
                      <option value="">Pilih Negeri</option>
                      {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state && <p className="text-red-500 text-xs mt-1 ml-1">{errors.state}</p>}
                  </div>
                  <input value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Bandar (pilihan)"
                    className={inputClass} />
                </div>

                {/* Landmark hint */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex gap-2">
                  <span className="text-sm shrink-0">💡</span>
                  <p className="text-xs text-blue-600 font-medium">
                    Tambah landmark berdekatan (cth: "depan Giant SS2", "belakang masjid") untuk mudahkan Technician cari lokasi.
                  </p>
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className={labelClass}>Keutamaan</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { val: 'urgent',   label: 'Urgent',    desc: 'Hari ini',  icon: '🔴' },
                    { val: 'normal',   label: 'Normal',    desc: '1–3 hari',  icon: '🟡' },
                    { val: 'flexible', label: 'Fleksibel', desc: 'Bila-bila', icon: '🟢' },
                  ] as const).map(opt => (
                    <button key={opt.val} type="button" onClick={() => setUrgency(opt.val)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all active:scale-95
                        ${urgency === opt.val ? 'border-[#1565C0] bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                      <div className="text-xl mb-0.5">{opt.icon}</div>
                      <p className={`text-xs font-black ${urgency === opt.val ? 'text-[#1565C0]' : 'text-gray-700'}`}>{opt.label}</p>
                      <p className="text-gray-400 text-xs">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarikh & Masa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tarikh <span className="normal-case font-normal text-gray-400">(pilihan)</span></label>
                  <input type="date" value={preferredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setPreferredDate(e.target.value)}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Masa <span className="normal-case font-normal text-gray-400">(pilihan)</span></label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { val: 'morning',   label: '🌅 Pagi' },
                      { val: 'afternoon', label: '☀️ Tghari' },
                      { val: 'evening',   label: '🌆 Petang' },
                      { val: 'anytime',   label: '🕐 Bila2' },
                    ] as const).map(t => (
                      <button key={t.val} type="button" onClick={() => setPreferredTime(prev => prev === t.val ? '' : t.val)}
                        className={`py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 text-center
                          ${preferredTime === t.val ? 'border-[#1565C0] bg-blue-50 text-[#1565C0]' : 'border-slate-100 bg-slate-50 text-gray-600'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 space-y-2">
            {step === 1 ? (
              <button type="button" onClick={handleNext}
                className="w-full text-white rounded-2xl py-3.5 font-black text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
                Seterusnya →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="w-full text-white rounded-2xl py-3.5 font-black text-sm transition-all disabled:opacity-60 hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
                {loading ? 'Sedang menghantar...' : '🚀 Hantar Job Sekarang'}
              </button>
            )}
            {step > 1 && (
              <button type="button" onClick={() => setStep(1)}
                className="w-full py-3 text-gray-400 text-xs font-bold hover:text-gray-600 transition">
                ← Kembali
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
