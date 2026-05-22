'use client'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import api from '@/lib/api'

interface Category {
  id: string
  name: string
  name_ms: string
  slug: string
}

interface RecentJob {
  id: string
  title: string
  status: string
  bids_count: number
  created_at: string
}

interface NearbyProvider {
  id: string
  business_name: string
  rating_avg: number
  total_reviews: number
  is_online: boolean
  distance_km: number
  avatar_url?: string
  verification_status?: string
}

const STATUS_MAP: Record<string, { label: string; desc: string; color: string; bg: string; border: string; icon: string; step: number }> = {
  open:        { label: 'Menunggu Tawaran',      desc: 'Job anda sedang menunggu Technician buat tawaran',        color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: '⏳', step: 1 },
  bidding:     { label: 'Ada Tawaran!',          desc: 'Technician telah hantar tawaran harga — semak sekarang!', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🔔', step: 2 },
  assigned:    { label: 'Technician Dipilih',    desc: 'Technician telah ditetapkan, menunggu kerja bermula',     color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: '✅', step: 3 },
  otw:         { label: 'Technician OTW',        desc: 'Technician sedang dalam perjalanan ke lokasi anda',       color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   icon: '🚗', step: 4 },
  in_progress: { label: 'Kerja Sedang Berjalan', desc: 'Technician sedang menyelesaikan kerja anda',              color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: '🔧', step: 5 },
  completed:   { label: 'Selesai!',              desc: 'Kerja berjaya diselesaikan — terima kasih!',              color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: '🎉', step: 6 },
  cancelled:   { label: 'Dibatalkan',            desc: 'Permintaan ini telah dibatalkan',                         color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',   icon: '❌', step: 0 },
}

const STEPS = ['Hantar', 'Tawaran', 'Terima', 'OTW', 'Proses', 'Siap']

const CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  electrical: { icon: '⚡', color: 'bg-yellow-50 border-yellow-200' },
  aircond:    { icon: '❄️', color: 'bg-blue-50 border-blue-200' },
  plumbing:   { icon: '🔧', color: 'bg-cyan-50 border-cyan-200' },
  appliance:  { icon: '📺', color: 'bg-purple-50 border-purple-200' },
  'it-tech':  { icon: '💻', color: 'bg-green-50 border-green-200' },
  handyman:   { icon: '🏠', color: 'bg-orange-50 border-orange-200' },
}

const STATUS_PRIORITY: Record<string, number> = {
  bidding: 0, in_progress: 1, assigned: 2, open: 3, completed: 4, cancelled: 5
}

export default function HomePage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { chatBadge, unreadCount, setChatBadge } = useNotificationStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [nearby, setNearby] = useState<NearbyProvider[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState('')
  const [locationDetected, setLocationDetected] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/api/categories')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'customer') return
    setJobsLoading(true)
    api.get('/api/jobs?limit=10&page=1')
      .then(({ data }) => {
        const all: RecentJob[] = data.jobs || []
        all.sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))
        setRecentJobs(all)
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false))
  }, [user])

  const detectAndFetchNearby = () => {
    if (!navigator.geolocation) { setNearbyError('Browser tidak support GPS'); return }
    setNearbyLoading(true); setNearbyError('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { data } = await api.get(`/api/providers/nearby?lat=${coords.latitude}&lng=${coords.longitude}&radius=50&limit=5`)
          setNearby(data.providers || [])
          setLocationDetected(true)
        } catch { setNearbyError('Gagal mendapatkan technician berdekatan') }
        finally { setNearbyLoading(false) }
      },
      () => { setNearbyError('Kebenaran lokasi ditolak'); setNearbyLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Filter categories based on search
  const filteredCategories = searchQuery.trim()
    ? categories.filter(c =>
        c.name_ms.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredCategories.length === 1) {
      router.push(`/jobs/new?category=${filteredCategories[0].slug}`)
    }
  }

  const activeJobs = recentJobs.filter(j => !['completed', 'cancelled'].includes(j.status))

  return (
    <main className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #060d1f 0%, #0a1e3d 100%)' }} className="px-5 pt-12 pb-20">
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute left-0">
            {user && (
              <div>
                <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase leading-none mb-0.5">Hi,</p>
                <p className="text-white font-black text-sm leading-tight max-w-[120px] truncate">{user.full_name}</p>
              </div>
            )}
          </div>
          <img src="/logo.png" alt="Fixla" className="h-10 w-auto" style={{ filter: 'drop-shadow(0 2px 16px rgba(249,115,22,0.5))' }} />
          <div className="absolute right-0 flex items-center gap-2">
            {user ? (
              <>
                <Link href="/chat" onClick={() => setChatBadge(false)}
                  className="relative bg-white/15 backdrop-blur text-white w-9 h-9 rounded-full border border-white/20 hover:bg-white/25 transition flex items-center justify-center">
                  <span className="text-base">💬</span>
                  {chatBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center px-0.5">
                      <span className="text-white text-[9px] font-black leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : ''}
                      </span>
                    </span>
                  )}
                </Link>
                <Link href="/settings"
                  className="bg-white/15 backdrop-blur text-white w-9 h-9 rounded-full border border-white/20 hover:bg-white/25 transition flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </>
            ) : (
              <Link href="/login" className="bg-white/15 backdrop-blur text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 hover:bg-white/25 transition">
                Log Masuk
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-xl">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Cari servis yang anda perlukan..."
            className="flex-1 text-sm text-gray-700 outline-none bg-transparent"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-500 transition text-lg leading-none shrink-0">×</button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchQuery.trim() && (
          <div className="mt-2 bg-white rounded-2xl shadow-xl overflow-hidden">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => {
                const style = CATEGORY_STYLE[cat.slug] || { icon: '🔨', color: '' }
                return (
                  <Link key={cat.slug} href={`/jobs/new?category=${cat.slug}`}
                    onClick={() => setSearchQuery('')}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-50 last:border-0">
                    <span className="text-xl">{style.icon}</span>
                    <span className="text-sm font-bold text-gray-700">{cat.name_ms}</span>
                    <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })
            ) : (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-gray-400">Tiada servis dijumpai untuk &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="px-5 -mt-10 space-y-5 pb-10">

        {/* STATUS PERMINTAAN */}
        {user && user.role === 'customer' && (
          <>
            {jobsLoading ? (
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded-full w-1/3 mb-4" />
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                    <div className="h-5 bg-gray-100 rounded-full w-1/2" />
                    <div className="h-2 bg-gray-100 rounded-full w-full" />
                  </div>
                </div>
              </div>
            ) : activeJobs.length > 0 ? (
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Status Permintaan</p>
                    <p className="text-xs text-gray-400 mt-0.5">{activeJobs.length} permintaan aktif</p>
                  </div>
                  <Link href="/jobs" className="text-[#1565C0] text-xs font-black">Semua →</Link>
                </div>
                <div className="space-y-3">
                  {activeJobs.slice(0, 3).map((job) => {
                    const s = STATUS_MAP[job.status] || STATUS_MAP['open']
                    return (
                      <Link key={job.id} href={`/jobs/${job.id}`}
                        className={`block border-2 ${s.border} ${s.bg} rounded-2xl p-4 active:scale-[0.98] transition-transform`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm shrink-0">
                            <span className="text-3xl">{s.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-semibold truncate mb-1">{job.title}</p>
                            <p className={`text-lg font-black ${s.color} leading-tight`}>{s.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="mt-1">
                          <div className="flex justify-between mb-1">
                            {STEPS.map((step, i) => (
                              <span key={step} className={`text-[9px] font-black ${i < s.step ? s.color : 'text-gray-300'}`}>{step}</span>
                            ))}
                          </div>
                          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ background: s.step === 0 ? '#d1d5db' : 'linear-gradient(90deg,#F97316,#EA6C0A)', width: `${(s.step / 5) * 100}%` }} />
                          </div>
                        </div>
                        {job.bids_count > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-black text-white bg-orange-400 px-2.5 py-0.5 rounded-full">
                              🔔 {job.bids_count} tawaran — Tekan untuk semak!
                            </span>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
                <Link href="/jobs/new" className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-black text-gray-400 hover:border-orange-300 hover:text-orange-400 transition">
                  <span className="text-base">+</span> Post Job Baru
                </Link>
              </div>
            ) : recentJobs.length > 0 ? (
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Status Permintaan</p>
                <div className="flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <p className="text-sm font-black text-green-700">Semua job selesai!</p>
                    <p className="text-xs text-gray-400">Tiada permintaan aktif pada masa ini</p>
                  </div>
                </div>
                <Link href="/jobs/new" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)' }}>+ Post Job Baru</Link>
              </div>
            ) : (
              <div className="rounded-3xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F97316, #EA6C0A)' }}>
                <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/10 rounded-full" />
                <div className="absolute -right-1 -bottom-6 w-20 h-20 bg-white/10 rounded-full" />
                <div className="relative">
                  <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Selamat Datang!</p>
                  <h3 className="font-black text-xl mb-1">Ada masalah di rumah?</h3>
                  <p className="text-orange-100 text-sm mb-4 leading-relaxed">Post job sekarang — Technician berdekatan akan buat tawaran harga untuk anda</p>
                  <Link href="/jobs/new" className="inline-flex items-center gap-2 bg-white text-[#F97316] font-black text-sm px-5 py-2.5 rounded-xl hover:bg-orange-50 transition shadow-lg">
                    Post Job Pertama Anda
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* KATEGORI SERVIS */}
        <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Kategori Servis</h2>
          {categories.length === 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl p-3 animate-pulse h-16" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredCategories.map((cat) => {
                const style = CATEGORY_STYLE[cat.slug] || { icon: '🔨', color: 'bg-gray-50 border-gray-200' }
                return (
                  <Link key={cat.slug} href={`/jobs/new?category=${cat.slug}`}
                    className={`${style.color} border-2 rounded-2xl p-3 text-center hover:scale-105 transition-transform active:scale-95`}>
                    <div className="text-2xl mb-1.5">{style.icon}</div>
                    <p className="text-xs font-bold text-gray-700 leading-tight">{cat.name_ms}</p>
                  </Link>
                )
              })}
              {searchQuery && filteredCategories.length === 0 && (
                <div className="col-span-3 py-6 text-center text-sm text-gray-400">Tiada hasil untuk &ldquo;{searchQuery}&rdquo;</div>
              )}
            </div>
          )}
        </div>

        {/* PERMINTAAN SAYA */}
        {user && (
          <Link href="/jobs" className="flex items-center gap-3 bg-white rounded-3xl shadow-sm border border-gray-100 p-4 hover:bg-gray-50 active:scale-[0.99] transition-all">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
              <span className="text-xl">📋</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-gray-800">Semua Permintaan Saya</p>
              <p className="text-xs text-gray-400">Lihat semua job yang pernah dihantar</p>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </Link>
        )}

        {/* CTA — belum login */}
        {!user && (
          <div className="rounded-3xl p-6 text-white overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #F97316, #EA6C0A)' }}>
            <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/10 rounded-full" />
            <div className="absolute -right-1 -bottom-6 w-20 h-20 bg-white/10 rounded-full" />
            <div className="relative">
              <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Ada masalah?</p>
              <h3 className="font-black text-xl mb-1">Kami sedia membantu</h3>
              <p className="text-orange-100 text-sm mb-4 leading-relaxed">Post job sekarang, Technician berdekatan akan hubungi anda</p>
              <Link href="/login" className="inline-flex items-center gap-2 bg-white text-[#F97316] font-black text-sm px-5 py-2.5 rounded-xl hover:bg-orange-50 transition shadow-lg">
                Log Masuk untuk Post Job
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </div>
        )}

        {/* TECHNICIAN BERDEKATAN */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Technician Berdekatan</h2>
            {locationDetected && (
              <button onClick={detectAndFetchNearby} className="text-xs text-[#1565C0] font-bold">Refresh</button>
            )}
          </div>

          {!locationDetected && !nearbyLoading && (
            <button onClick={detectAndFetchNearby}
              className="w-full bg-white rounded-3xl border border-gray-100 p-6 text-center shadow-sm hover:bg-gray-50 active:scale-[0.99] transition-all">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-black text-gray-700 mb-1">Cari Technician Berdekatan</p>
              <p className="text-xs text-gray-400">Tekan untuk aktifkan GPS dan cari technician yang ada</p>
            </button>
          )}

          {nearbyLoading && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center shadow-sm">
              <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{borderWidth: 3}} />
              <p className="text-xs text-gray-400">Mencari technician berdekatan...</p>
            </div>
          )}

          {nearbyError && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-red-500">{nearbyError}</p>
              <button onClick={detectAndFetchNearby} className="text-xs font-bold text-red-500 underline">Cuba semula</button>
            </div>
          )}

          {locationDetected && nearby.length === 0 && !nearbyLoading && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center shadow-sm">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm font-semibold text-gray-600 mb-1">Tiada technician dalam radius 50km</p>
              <p className="text-xs text-gray-400">Cuba semula kemudian atau post job — technician akan hubungi anda</p>
            </div>
          )}

          {nearby.length > 0 && (
            <div className="space-y-3">
              {nearby.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center font-black text-[#F97316] shrink-0">
                    {p.business_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-black text-gray-800 truncate">{p.business_name}</p>
                      {p.verification_status === 'pending' && (
                        <span className="text-[10px] font-bold bg-yellow-50 text-yellow-600 border border-yellow-200 px-1.5 py-0.5 rounded-full shrink-0">Belum Disahkan</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        ⭐ {p.rating_avg > 0 ? Number(p.rating_avg).toFixed(1) : 'Baru'}
                        {p.total_reviews > 0 && ` (${p.total_reviews})`}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">📍 {p.distance_km.toFixed(1)} km</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${p.is_online ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    {p.is_online ? '● Online' : '○ Offline'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
