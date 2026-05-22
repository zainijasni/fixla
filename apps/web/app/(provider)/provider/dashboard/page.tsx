'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'

interface ProviderProfile {
  base_lat?: number
  base_lng?: number
  base_address?: string
  service_radius_km?: number
  is_online: boolean
  verification_status: string
  business_name: string
  rating_avg: number
  total_reviews: number
  total_jobs_completed: number
}

interface AssignedJob {
  id: string
  title: string
  status: string
  category_name: string
  location_address: string
  location_lat?: number
  location_lng?: number
  state: string
  city: string
  urgency: string
  customer_name: string
  customer_phone: string
  agreed_price: number
  conversation_id: string | null
  updated_at: string
}

interface Toast {
  id: string
  type: 'bid_accepted' | 'bid_rejected' | 'new_job' | 'new_chat'
  title: string
  body: string
  job_id?: string
  conversation_id?: string
}

const RADIUS_OPTIONS = [
  { km: 10,  label: '10 km',  desc: 'Kawasan bandar sahaja' },
  { km: 20,  label: '20 km',  desc: 'Sekitar bandar' },
  { km: 30,  label: '30 km',  desc: 'Kawasan daerah' },
  { km: 50,  label: '50 km',  desc: 'Seluruh daerah' },
  { km: 100, label: '100 km', desc: 'Seluruh negeri' },
]

const MALAYSIA_STATES = [
  { name: 'W.P. Kuala Lumpur',  lat: 3.1390,  lng: 101.6869 },
  { name: 'W.P. Putrajaya',     lat: 2.9264,  lng: 101.6964 },
  { name: 'W.P. Labuan',        lat: 5.2831,  lng: 115.2308 },
  { name: 'Selangor',           lat: 3.0738,  lng: 101.5183 },
  { name: 'Johor',              lat: 1.9344,  lng: 103.3587 },
  { name: 'Kedah',              lat: 5.8436,  lng: 100.5765 },
  { name: 'Kelantan',           lat: 5.7454,  lng: 102.4131 },
  { name: 'Melaka',             lat: 2.2001,  lng: 102.2362 },
  { name: 'Negeri Sembilan',    lat: 2.7258,  lng: 101.9424 },
  { name: 'Pahang',             lat: 3.8126,  lng: 103.3256 },
  { name: 'Perak',              lat: 4.5921,  lng: 101.0901 },
  { name: 'Perlis',             lat: 6.4449,  lng: 100.2048 },
  { name: 'Pulau Pinang',       lat: 5.4164,  lng: 100.3327 },
  { name: 'Sabah',              lat: 5.9788,  lng: 116.0753 },
  { name: 'Sarawak',            lat: 1.5533,  lng: 110.3592 },
  { name: 'Terengganu',         lat: 5.3117,  lng: 103.1324 },
]

const JOB_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  assigned:    { label: 'Tawaran Diterima',    color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
  otw:         { label: 'Dalam Perjalanan',    color: 'text-cyan-700',   bg: 'bg-cyan-50',    border: 'border-cyan-200'   },
  in_progress: { label: 'Kerja Berjalan',      color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  completed:   { label: 'Selesai',             color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200'  },
}

export default function ProviderDashboardPage() {
  const router = useRouter()
  const { user, logout, token } = useAuthStore()
  const { chatBadge, unreadCount, setChatBadge } = useNotificationStore()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignedJob[]>([])
  const [updatingJob, setUpdatingJob] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [navJob, setNavJob] = useState<AssignedJob | null>(null)

  // Location setup state
  const [showLocSetup, setShowLocSetup] = useState(false)
  const [locMode, setLocMode] = useState<'gps' | 'manual'>('gps')
  const [detectedLat, setDetectedLat] = useState<number | null>(null)
  const [detectedLng, setDetectedLng] = useState<number | null>(null)
  const [detectedAddress, setDetectedAddress] = useState('')
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualState, setManualState] = useState('')
  const [selectedRadius, setSelectedRadius] = useState(30)
  const [savingLoc, setSavingLoc] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [togglingOnline, setTogglingOnline] = useState(false)

  const pushToast = (t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 6000)
  }

  const loadAssignments = useCallback(async () => {
    try {
      const { data } = await api.get('/api/jobs/my-assignments')
      setAssignments(data.jobs || [])
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'provider') { router.push('/'); return }
    api.get('/api/providers/me')
      .then(({ data }) => {
        setProfile(data)
        if (!data.base_lat || !data.base_lng) setShowLocSetup(true)
        else if (data.service_radius_km) setSelectedRadius(data.service_radius_km)
      })
      .catch(() => setShowLocSetup(true))
      .finally(() => setLoading(false))
    loadAssignments()
  }, [user, router, loadAssignments])

  // Socket.io — dashboard-specific notifications (chat handled by layout)
  useEffect(() => {
    if (!token) return
    const socket = getSocket(token)

    const handleBidAccepted = (data: { job_id: string; job_title: string; agreed_price: number; conversation_id: string }) => {
      pushToast({
        type: 'bid_accepted',
        title: '🎉 Tawaran Diterima!',
        body: `"${data.job_title}" — RM ${data.agreed_price}`,
        job_id: data.job_id,
        conversation_id: data.conversation_id
      })
      loadAssignments()
    }

    const handleBidRejected = (data: { job_id: string; job_title: string }) => {
      pushToast({
        type: 'bid_rejected',
        title: '❌ Tawaran Ditolak',
        body: `"${data.job_title}" — customer telah memilih technician lain`,
        job_id: data.job_id
      })
    }

    const handleNewJob = (data: { job_title: string }) => {
      pushToast({
        type: 'new_job',
        title: '📋 Job Baru Berdekatan!',
        body: data.job_title
      })
    }

    socket.on('bid_accepted', handleBidAccepted)
    socket.on('bid_rejected', handleBidRejected)
    socket.on('new_job', handleNewJob)

    return () => {
      socket.off('bid_accepted', handleBidAccepted)
      socket.off('bid_rejected', handleBidRejected)
      socket.off('new_job', handleNewJob)
    }
  }, [token, loadAssignments])

  const handleLogout = () => { logout(); router.push('/login') }

  const detectGPS = () => {
    if (!navigator.geolocation) { setLocError('Browser tidak support GPS'); return }
    setLocating(true); setLocError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setDetectedLat(latitude); setDetectedLng(longitude)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ms`)
          const geo = await res.json()
          const addr = geo.address || {}
          const area = [addr.village || addr.suburb || addr.town || addr.city || '', addr.county || addr.city || '', addr.state || ''].filter(Boolean).join(', ')
          setDetectedAddress(area || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        } catch { setDetectedAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`) }
        setLocating(false)
      },
      (err) => {
        const msgs: Record<number, string> = { 1: 'Kebenaran GPS ditolak.', 2: 'Gagal mendapat lokasi.', 3: 'Masa tamat.' }
        setLocError(msgs[err.code] || 'Gagal detect lokasi.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const getLocToSave = () => {
    if (locMode === 'gps') return { lat: detectedLat, lng: detectedLng, address: detectedAddress }
    const stateData = MALAYSIA_STATES.find(s => s.name === manualState)
    return { lat: stateData?.lat ?? null, lng: stateData?.lng ?? null, address: manualAddress ? `${manualAddress}, ${manualState}` : manualState }
  }

  const canSave = locMode === 'gps' ? !!detectedLat && !!detectedLng : !!manualState

  const handleSaveLocation = async () => {
    if (!canSave) return
    setSavingLoc(true); setSaveError('')
    const { lat, lng, address } = getLocToSave()
    try {
      await api.patch('/api/providers/me', { base_lat: lat, base_lng: lng, base_address: address, service_radius_km: selectedRadius })
      const { data } = await api.get('/api/providers/me')
      setProfile(data); setShowLocSetup(false)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setSaveError(e?.response?.data?.error?.message || 'Gagal menyimpan. Cuba semula.')
    } finally { setSavingLoc(false) }
  }

  const updateStatus = async (jobId: string, status: 'otw' | 'in_progress' | 'completed') => {
    setUpdatingJob(jobId)
    try {
      await api.patch(`/api/jobs/${jobId}/progress`, { status })
      await loadAssignments()
    } catch { alert('Gagal kemaskini status. Cuba semula.') }
    finally { setUpdatingJob(null) }
  }

  const openNavApp = (job: AssignedJob, app: 'waze' | 'maps') => {
    const lat = job.location_lat
    const lng = job.location_lng
    const addr = encodeURIComponent(`${job.location_address || job.city}, ${job.state}, Malaysia`)
    if (app === 'waze') {
      window.open(lat && lng ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : `https://waze.com/ul?q=${addr}&navigate=yes`, '_blank')
    } else {
      window.open(lat && lng ? `https://maps.google.com/?daddr=${lat},${lng}` : `https://maps.google.com/?daddr=${addr}`, '_blank')
    }
  }

  const handleOTW = (job: AssignedJob) => setNavJob(job)

  const confirmOTW = async (job: AssignedJob) => {
    setNavJob(null)
    setUpdatingJob(job.id)
    try {
      await api.patch(`/api/jobs/${job.id}/progress`, { status: 'otw' })
      await loadAssignments()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      alert(`Gagal kemaskini status OTW: ${e?.response?.data?.error?.message || 'Cuba semula.'}`)
    } finally {
      setUpdatingJob(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Location Setup Screen ────────────────────────────────────
  if (showLocSetup) return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-12 pb-20">
        <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-2">Satu langkah lagi</p>
        <h1 className="text-white font-black text-2xl leading-tight">Set Kawasan<br />Operasi Anda</h1>
        <p className="text-blue-200/70 text-xs mt-2">Anda hanya akan nampak job dalam radius yang anda tetapkan</p>
      </div>
      <div className="px-5 -mt-10 pb-8">
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">1. Lokasi Operasi</label>
            <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => { setLocMode('gps'); setLocError('') }} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${locMode === 'gps' ? 'bg-white text-[#1565C0] shadow-sm' : 'text-gray-500'}`}>📡 GPS Automatik</button>
              <button onClick={() => setLocMode('manual')} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${locMode === 'manual' ? 'bg-white text-[#1565C0] shadow-sm' : 'text-gray-500'}`}>✍️ Input Manual</button>
            </div>
            {locMode === 'gps' && (
              <div className="space-y-2">
                <button onClick={detectGPS} disabled={locating || savingLoc} className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-black text-sm transition disabled:opacity-60 ${detectedLat ? 'border-green-400 bg-green-50 text-green-700' : 'border-dashed border-[#1565C0] text-[#1565C0] hover:bg-blue-50'}`}>
                  {locating ? <><div className="w-4 h-4 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" />Mengesan lokasi...</> : detectedLat ? <>✅ Lokasi dikesan — Tap untuk tukar</> : <>📍 Detect Lokasi Saya (GPS)</>}
                </button>
                {detectedAddress && <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-2.5"><p className="text-xs text-green-600 font-semibold">📍 {detectedAddress}</p></div>}
                {locError && <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-2.5"><p className="text-red-500 text-xs font-semibold">{locError}</p></div>}
              </div>
            )}
            {locMode === 'manual' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Negeri / Kawasan</label>
                  <div className="relative">
                    <select value={manualState} onChange={e => setManualState(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1565C0] transition-all appearance-none font-medium">
                      <option value="">-- Pilih Negeri --</option>
                      {MALAYSIA_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Bandar / Kawasan Spesifik <span className="text-gray-400 font-normal">(pilihan)</span></label>
                  <input type="text" value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="cth: Nilai, Seremban, Taman Jaya..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1565C0] transition-all font-medium" />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">2. Radius Operasi</label>
            <div className="space-y-2">
              {RADIUS_OPTIONS.map(opt => (
                <button key={opt.km} type="button" onClick={() => setSelectedRadius(opt.km)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${selectedRadius === opt.km ? 'border-[#1565C0] bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                  <div className="text-left">
                    <p className={`text-sm font-black ${selectedRadius === opt.km ? 'text-[#1565C0]' : 'text-gray-700'}`}>{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRadius === opt.km ? 'border-[#1565C0] bg-[#1565C0]' : 'border-gray-300'}`}>
                    {selectedRadius === opt.km && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {saveError && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-600 font-semibold">⚠️ {saveError}</div>}
          <button onClick={handleSaveLocation} disabled={!canSave || savingLoc} className="w-full py-3.5 rounded-2xl text-white font-black text-sm transition-all disabled:opacity-50 hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
            {savingLoc ? 'Menyimpan...' : 'Simpan & Teruskan →'}
          </button>
        </div>
      </div>
    </div>
  )

  const toggleOnline = async () => {
    if (!profile || togglingOnline) return
    setTogglingOnline(true)
    const next = !profile.is_online
    try {
      await api.patch('/api/providers/status', { is_online: next })
      setProfile(prev => prev ? { ...prev, is_online: next } : prev)
    } catch { /* non-critical */ }
    finally { setTogglingOnline(false) }
  }

  const activeJobs  = assignments.filter(j => j.status !== 'completed')
  const doneJobs    = assignments.filter(j => j.status === 'completed').slice(0, 3)

  // ── Main Dashboard ───────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">

      {/* Toast notifications */}
      <div className="fixed top-4 left-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-2xl px-4 py-3 shadow-xl border pointer-events-auto flex items-start gap-3
            ${t.type === 'bid_accepted' ? 'bg-green-50 border-green-300' : t.type === 'bid_rejected' ? 'bg-red-50 border-red-300' : t.type === 'new_job' ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-300'}`}>
            <div className="flex-1">
              <p className="text-sm font-black text-gray-800">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.body}</p>
            </div>
            {t.type === 'bid_accepted' && t.job_id && (
              <button onClick={() => { setToasts(p => p.filter(x => x.id !== t.id)); loadAssignments() }}
                className="text-xs font-black text-green-700 underline shrink-0">Lihat</button>
            )}
            {t.type === 'new_chat' && (
              <button onClick={() => { router.push('/chat'); setChatBadge(false) }}
                className="text-xs font-black text-blue-700 underline shrink-0">Buka</button>
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-10 pb-20">

        {/* Row 1 — branding + icon actions */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-300 text-[10px] font-bold tracking-widest uppercase leading-none mb-0.5">Dashboard Technician</p>
            <p className="text-white font-black text-lg leading-tight">{user?.full_name || 'Technician'}</p>
            {profile?.base_address && <p className="text-blue-200/60 text-xs mt-0.5 truncate max-w-[200px]">📍 {profile.base_address}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/provider/settings')}
              className="bg-white/10 text-white w-9 h-9 rounded-full border border-white/20 hover:bg-white/25 transition flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button onClick={handleLogout}
              className="bg-red-500/80 hover:bg-red-500 text-white text-xs font-black px-4 py-2 rounded-full transition">
              Log Keluar
            </button>
          </div>
        </div>

        {/* Row 2 — Online/Offline toggle (prominent) */}
        <button
          onClick={toggleOnline}
          disabled={togglingOnline}
          className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition ${
            profile?.is_online
              ? 'bg-green-500/20 border-green-400/50 hover:bg-green-500/30'
              : 'bg-white/8 border-white/20 hover:bg-white/15'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 ${profile?.is_online ? 'bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.6)]' : 'bg-gray-500'} ${togglingOnline ? 'animate-pulse' : ''}`} />
            <div className="text-left">
              <p className={`text-sm font-black leading-none ${profile?.is_online ? 'text-green-300' : 'text-gray-400'}`}>
                {togglingOnline ? 'Menukar...' : profile?.is_online ? 'Anda Online' : 'Anda Offline'}
              </p>
              <p className="text-[11px] text-white/40 mt-0.5 leading-none">
                {profile?.is_online ? 'Pelanggan boleh cari & hubungi anda' : 'Tekan untuk mula terima tempahan'}
              </p>
            </div>
          </div>
          {/* Toggle pill */}
          <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${profile?.is_online ? 'bg-green-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${profile?.is_online ? 'left-6' : 'left-0.5'}`} />
          </div>
        </button>

        {profile?.verification_status === 'pending' && (
          <div className="mt-3 bg-orange-500/20 border border-orange-400/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-orange-300 text-lg">⏳</span>
            <div>
              <p className="text-orange-200 text-xs font-black">Akaun Dalam Semakan</p>
              <p className="text-orange-200/70 text-[11px]">Admin akan sahkan dalam masa 24-48 jam</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 -mt-10 space-y-4 pb-28">

        {/* ════════════════════════════════════
            ACTIVE JOBS — paling atas sekali
            ════════════════════════════════════ */}
        {activeJobs.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Job Aktif</p>
                <p className="text-xs text-gray-400 mt-0.5">{activeJobs.length} job dalam tangan</p>
              </div>
            </div>
            <div className="space-y-3">
              {activeJobs.map(job => {
                const st = JOB_STATUS[job.status] || JOB_STATUS['assigned']
                const isUpdating = updatingJob === job.id
                return (
                  <div key={job.id} className={`border-2 ${st.border} ${st.bg} rounded-2xl p-4`}>
                    {/* Status badge + title */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-black ${st.color}`}>{st.label}</span>
                        <p className="text-sm font-black text-gray-800 mt-0.5 leading-snug">{job.title}</p>
                        <p className="text-xs text-gray-500 mt-1">📍 {job.city}, {job.state}</p>
                        <p className="text-xs text-gray-500">👤 {job.customer_name}</p>
                        {job.agreed_price > 0 && (
                          <p className="text-sm font-black text-[#F97316] mt-1">RM {job.agreed_price}</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {/* Chat button */}
                      {job.conversation_id && (
                        <Link href={`/chat/${job.conversation_id}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border-2 border-blue-200 text-xs font-black text-[#1565C0] hover:bg-blue-50 transition">
                          💬 Chat
                        </Link>
                      )}
                      {/* Status update buttons */}
                      {job.status === 'assigned' && (
                        <button onClick={() => handleOTW(job)} disabled={isUpdating}
                          className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition">
                          {isUpdating ? '...' : '🚗 Dalam Perjalanan (OTW)'}
                        </button>
                      )}
                      {job.status === 'otw' && (
                        <button onClick={() => updateStatus(job.id, 'in_progress')} disabled={isUpdating}
                          className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition">
                          {isUpdating ? '...' : '🏠 Sudah Sampai / Mula Kerja'}
                        </button>
                      )}
                      {job.status === 'in_progress' && (
                        <button onClick={() => updateStatus(job.id, 'completed')} disabled={isUpdating}
                          className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition">
                          {isUpdating ? '...' : '✅ Tandakan Selesai'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Ringkasan</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Rating', value: profile?.rating_avg ? Number(profile.rating_avg).toFixed(1) : '—', icon: '⭐' },
              { label: 'Ulasan', value: String(profile?.total_reviews || 0), icon: '💬' },
              { label: 'Selesai', value: String(profile?.total_jobs_completed || 0), icon: '✅' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <p className="text-xl font-black text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Browse jobs CTA */}
        <button onClick={() => router.push('/provider/jobs')}
          className="w-full rounded-3xl p-5 text-white text-left relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-1 -bottom-5 w-16 h-16 bg-white/10 rounded-full" />
          <div className="relative">
            <p className="text-orange-100 text-xs font-bold mb-1">Cari kerja baru</p>
            <p className="font-black text-lg mb-1">Lihat Job Tersedia →</p>
            <p className="text-orange-100 text-xs">Job berdekatan {profile?.base_address || 'kawasan anda'}</p>
          </div>
        </button>

        {/* Kawasan operasi */}
        <button onClick={() => setShowLocSetup(true)} className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-xl">📍</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-800">Kawasan Operasi</p>
            <p className="text-xs text-gray-400">
              {profile?.base_address ? `${profile.base_address} · radius ${profile.service_radius_km ?? 30}km` : 'Belum ditetapkan'}
            </p>
          </div>
          <span className="text-gray-300 text-sm">›</span>
        </button>

        {/* Job selesai recently */}
        {doneJobs.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Job Selesai Terkini</p>
            <div className="space-y-2">
              {doneJobs.map(job => (
                <div key={job.id} className="flex items-center gap-3 bg-green-50 rounded-2xl px-3 py-2.5">
                  <span className="text-green-500">✅</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-700 truncate">{job.title}</p>
                    <p className="text-xs text-gray-400">RM {job.agreed_price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-around">
        {[
          { icon: '🏠', label: 'Dashboard', href: '/provider/dashboard', active: true },
          { icon: '📋', label: 'Job', href: '/provider/jobs', active: false },
        ].map(nav => (
          <button key={nav.href} onClick={() => router.push(nav.href)}
            className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition ${nav.active ? 'text-[#F97316]' : 'text-gray-400'}`}>
            <span className="text-xl">{nav.icon}</span>
            <span className="text-xs font-bold">{nav.label}</span>
          </button>
        ))}
        <button onClick={() => { router.push('/chat'); setChatBadge(false) }}
          className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition text-gray-400 relative">
          <span className="text-xl">💬</span>
          <span className="text-xs font-bold">Chat</span>
          {chatBadge && (
            <span className="absolute -top-1 right-2 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center px-0.5">
              <span className="text-white text-[9px] font-black leading-none">
                {unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : ''}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* Navigation modal — Grab-style */}
      {navJob && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNavJob(null)} />
          <div className="relative w-full bg-white rounded-t-3xl p-6 shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Navigasi ke Pelanggan</p>
            <h3 className="font-black text-gray-800 text-lg mb-0.5">{navJob.customer_name}</h3>
            <p className="text-sm text-gray-500 mb-5">📍 {navJob.location_address || `${navJob.city}, ${navJob.state}`}</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={() => { openNavApp(navJob, 'waze'); confirmOTW(navJob) }}
                className="flex flex-col items-center gap-2 p-5 bg-[#33CCFF]/10 border-2 border-[#33CCFF]/60 rounded-2xl active:scale-95 transition hover:bg-[#33CCFF]/20">
                <span className="text-4xl">🔵</span>
                <span className="font-black text-sm text-[#1DA1F2]">Waze</span>
                <span className="text-xs text-gray-400">Trafik masa nyata</span>
              </button>
              <button onClick={() => { openNavApp(navJob, 'maps'); confirmOTW(navJob) }}
                className="flex flex-col items-center gap-2 p-5 bg-red-50 border-2 border-red-200 rounded-2xl active:scale-95 transition hover:bg-red-100">
                <span className="text-4xl">🗺️</span>
                <span className="font-black text-sm text-red-600">Google Maps</span>
                <span className="text-xs text-gray-400">Google navigation</span>
              </button>
            </div>

            <button onClick={() => confirmOTW(navJob)}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-50 transition mb-2">
              Tandakan OTW Tanpa Peta
            </button>
            <button onClick={() => setNavJob(null)}
              className="w-full py-2 text-gray-400 text-xs font-bold">
              Batal
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
