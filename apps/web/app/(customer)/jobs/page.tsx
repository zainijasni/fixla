'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface Job {
  id: string
  title: string
  category_name: string
  urgency: 'urgent' | 'normal' | 'flexible'
  status: string
  bids_count: number
  location_address: string
  created_at: string
}

const URGENCY = {
  urgent:   { label: 'Urgent',    color: 'bg-red-100 text-red-600',      icon: '🔴' },
  normal:   { label: 'Normal',    color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  flexible: { label: 'Fleksibel', color: 'bg-green-100 text-green-700',   icon: '🟢' },
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:        { label: 'Menunggu Bid',  color: 'bg-blue-100 text-blue-700' },
  bidding:     { label: 'Ada Tawaran',   color: 'bg-orange-100 text-orange-700' },
  assigned:    { label: 'Ditetapkan',    color: 'bg-purple-100 text-purple-700' },
  in_progress: { label: 'Dalam Proses',  color: 'bg-indigo-100 text-indigo-700' },
  completed:   { label: 'Selesai',       color: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Dibatalkan',    color: 'bg-gray-100 text-gray-500' },
}

const FILTERS = [
  { key: '',          label: 'Semua' },
  { key: 'open',      label: 'Menunggu' },
  { key: 'bidding',   label: 'Ada Tawaran' },
  { key: 'assigned',  label: 'Ditetapkan' },
  { key: 'completed', label: 'Selesai' },
]

export default function MyJobsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('')

  const fetchJobs = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', page: '1' })
      if (status) params.set('status', status)
      const { data } = await api.get(`/api/jobs?${params}`)
      setJobs(data.jobs || [])
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'customer') { router.push('/'); return }
    fetchJobs(activeFilter)
  }, [user, router, fetchJobs, activeFilter])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-10 pb-16">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/')} className="text-white/70 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => router.push('/')}>
            <img src="/logo.png" alt="Fixla" className="h-8 w-auto"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.5))' }} />
          </button>
          <div className="w-5" />{/* spacer */}
        </div>
        <div className="mb-4">
          <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-1">Rekod</p>
          <h1 className="text-white font-black text-xl">Permintaan Saya</h1>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all shrink-0
                ${activeFilter === f.key
                  ? 'bg-white text-gray-800'
                  : 'bg-white/15 text-white border border-white/20'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 -mt-8 pb-24 space-y-3">

        {/* Post job CTA */}
        <Link href="/jobs/new"
          className="flex items-center gap-3 w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-4 hover:bg-gray-50 transition">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)' }}>
            <span className="text-white text-xl font-black">+</span>
          </div>
          <div>
            <p className="text-sm font-black text-gray-800">Post Job Baru</p>
            <p className="text-xs text-gray-400">Hantar permintaan servis baharu</p>
          </div>
          <span className="text-gray-300 ml-auto text-sm">›</span>
        </Link>

        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-5 animate-pulse border border-gray-100">
              <div className="h-3 bg-gray-100 rounded-full w-1/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded-full w-4/5 mb-2" />
              <div className="h-3 bg-gray-100 rounded-full w-1/2" />
            </div>
          ))
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 text-center mt-2">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-bold text-gray-700 mb-1">
              {activeFilter ? 'Tiada permintaan dengan status ini' : 'Belum ada permintaan'}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {activeFilter ? 'Cuba tukar filter di atas' : 'Post job pertama anda sekarang'}
            </p>
            {!activeFilter && (
              <Link href="/jobs/new"
                className="inline-flex items-center gap-2 text-xs font-black text-white px-5 py-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)' }}>
                Post Job Sekarang
              </Link>
            )}
          </div>
        ) : (
          jobs.map(job => {
            const urg = URGENCY[job.urgency] || URGENCY.normal
            const st = STATUS_MAP[job.status] || { label: job.status, color: 'bg-gray-100 text-gray-500' }
            return (
              <Link key={job.id} href={`/jobs/${job.id}`}
                className="block bg-white rounded-3xl shadow-sm border border-gray-100 p-5 hover:bg-gray-50 active:scale-[0.99] transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full ${urg.color}`}>
                        {urg.icon} {urg.label}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold">{job.category_name}</span>
                    </div>
                    <p className="text-sm font-black text-gray-800 leading-snug">{job.title}</p>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1.5 rounded-full shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>📅 {formatDate(job.created_at)}</span>
                  {job.bids_count > 0 && (
                    <span className="font-bold text-[#1565C0]">
                      {job.bids_count} tawaran
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      background: 'linear-gradient(90deg,#F97316,#EA6C0A)',
                      width: job.status === 'open' ? '15%'
                        : job.status === 'bidding' ? '35%'
                        : job.status === 'assigned' ? '55%'
                        : job.status === 'in_progress' ? '75%'
                        : job.status === 'completed' ? '100%'
                        : '0%'
                    }} />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
