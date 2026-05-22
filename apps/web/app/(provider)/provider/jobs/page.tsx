'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface Job {
  id: string
  title: string
  description: string
  category_name: string
  location_address: string
  state: string
  city: string
  urgency: 'urgent' | 'normal' | 'flexible'
  preferred_date?: string
  preferred_time?: string
  budget_min?: number
  budget_max?: number
  status: string
  bids_count: number
  created_at: string
}

interface BidForm {
  proposed_price: string
  estimated_duration: string
  message: string
}

const URGENCY = {
  urgent:   { label: 'Urgent',    color: 'bg-red-100 text-red-600',       icon: '🔴' },
  normal:   { label: 'Normal',    color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  flexible: { label: 'Fleksibel', color: 'bg-green-100 text-green-700',   icon: '🟢' },
}

const TIME_LABEL: Record<string, string> = {
  morning: 'Pagi', afternoon: 'Tengahari', evening: 'Petang', anytime: 'Bila-bila'
}

export default function ProviderJobsPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [providerState, setProviderState] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent'>('all')

  // Bid modal
  const [biddingJob, setBiddingJob] = useState<Job | null>(null)
  const [bidForm, setBidForm] = useState<BidForm>({ proposed_price: '', estimated_duration: '', message: '' })
  const [bidLoading, setBidLoading] = useState(false)
  const [bidError, setBidError] = useState('')
  const [bidSuccess, setBidSuccess] = useState('')
  const [enquiryLoading, setEnquiryLoading] = useState<string | null>(null)

  const fetchJobs = useCallback(async (state: string, urgencyFilter: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '30', page: '1' })
      if (urgencyFilter === 'urgent') params.set('urgency', 'urgent')
      if (state) params.set('state', state)
      const { data } = await api.get(`/api/jobs?${params}`)
      setJobs((data.jobs || []).filter((j: Job) => ['open', 'bidding'].includes(j.status)))
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'provider') { router.push('/'); return }
    api.get('/api/providers/me').then(({ data }) => {
      const state = data.base_address?.split(', ').pop() || ''
      setProviderState(state)
      fetchJobs(state, activeFilter)
    }).catch(() => fetchJobs('', activeFilter))
  }, [user, router, fetchJobs, activeFilter])

  const openBidModal = (job: Job) => {
    setBiddingJob(job)
    setBidForm({ proposed_price: '', estimated_duration: '', message: '' })
    setBidError('')
    setBidSuccess('')
  }

  const handleEnquiry = async (job: Job) => {
    setEnquiryLoading(job.id)
    try {
      const { data } = await api.post('/api/conversations/provider-init', { job_id: job.id })
      const convId = data.conversation?.id || data.id
      if (!convId) throw new Error('No conversation ID returned')
      router.push(`/chat/${convId}`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      alert(`Gagal memulakan perbualan: ${e?.response?.data?.error?.message || e?.message || 'Cuba semula.'}`)
    } finally {
      setEnquiryLoading(null)
    }
  }

  const handleBidSubmit = async () => {
    if (!biddingJob) return
    if (!bidForm.proposed_price || Number(bidForm.proposed_price) < 1) {
      setBidError('Sila masukkan harga yang sah')
      return
    }
    setBidLoading(true)
    setBidError('')
    try {
      await api.post(`/api/bids/jobs/${biddingJob.id}`, {
        proposed_price: Number(bidForm.proposed_price),
        estimated_duration: bidForm.estimated_duration || undefined,
        message: bidForm.message || undefined
      })
      setBidSuccess('Bid berjaya dihantar!')
      fetchJobs(providerState, activeFilter)
      setTimeout(() => { setBiddingJob(null); setBidSuccess('') }, 2000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setBidError(e?.response?.data?.error?.message || 'Gagal hantar bid. Cuba semula.')
    } finally {
      setBidLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-10 pb-16">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-1">
              {providerState || 'Semua kawasan'}
            </p>
            <h1 className="text-white font-black text-xl">Job Tersedia</h1>
          </div>
          <button onClick={() => router.push('/provider/dashboard')}
            className="bg-white/15 backdrop-blur text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 hover:bg-white/25 transition">
            Dashboard
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          {(['all', 'urgent'] as const).map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all
                ${activeFilter === f ? 'bg-white text-gray-800' : 'bg-white/15 text-white border border-white/20'}`}>
              {f === 'all' ? 'Semua' : '🔴 Urgent'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 -mt-8 pb-24 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-5 animate-pulse border border-gray-100">
              <div className="h-4 bg-gray-100 rounded-full w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded-full w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded-full w-2/3" />
            </div>
          ))
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-10 text-center border border-gray-100 mt-2">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-700 font-bold text-sm mb-1">Tiada job buat masa ini</p>
            <p className="text-xs text-gray-400 mb-4">
              {providerState ? `Tiada job baru di ${providerState}` : 'Semak semula sebentar lagi'}
            </p>
            <button onClick={() => fetchJobs(providerState, activeFilter)}
              className="px-5 py-2 text-xs font-black text-[#1565C0] border-2 border-[#1565C0] rounded-xl hover:bg-blue-50 transition">
              🔄 Refresh
            </button>
          </div>
        ) : (
          jobs.map(job => {
            const urg = URGENCY[job.urgency]
            return (
              <div key={job.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full ${urg.color}`}>
                        {urg.icon} {urg.label}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold">{job.category_name}</span>
                    </div>
                    <p className="text-gray-800 font-black text-sm leading-snug">{job.title}</p>
                  </div>
                  {job.bids_count > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#1565C0] shrink-0">
                      {job.bids_count} bid
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>📍</span><span>{job.city}, {job.state}</span>
                  </div>
                  {job.preferred_date && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>📅</span>
                      <span>
                        {new Date(job.preferred_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {job.preferred_time && ` • ${TIME_LABEL[job.preferred_time]}`}
                      </span>
                    </div>
                  )}
                  {(job.budget_min || job.budget_max) && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>💰</span>
                      <span>
                        {job.budget_min && job.budget_max
                          ? `RM ${job.budget_min} – RM ${job.budget_max}`
                          : job.budget_max ? `Sehingga RM ${job.budget_max}` : `Dari RM ${job.budget_min}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>🕐</span>
                    <span>{new Date(job.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleEnquiry(job)} disabled={enquiryLoading === job.id}
                    className="flex-1 py-2.5 rounded-2xl font-black text-sm text-[#1565C0] border-2 border-[#1565C0] hover:bg-blue-50 transition disabled:opacity-50">
                    {enquiryLoading === job.id ? '...' : '💬 Tanya Dulu'}
                  </button>
                  <button onClick={() => openBidModal(job)}
                    className="flex-1 py-2.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
                    💰 Tawaran
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-around">
        {[
          { icon: '📋', label: 'Job', href: '/provider/jobs', active: true },
          { icon: '🏠', label: 'Dashboard', href: '/provider/dashboard', active: false },
          { icon: '💬', label: 'Chat', href: '/chat', active: false },
        ].map(nav => (
          <button key={nav.href} onClick={() => router.push(nav.href)}
            className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition ${nav.active ? 'text-[#F97316]' : 'text-gray-400'}`}>
            <span className="text-xl">{nav.icon}</span>
            <span className="text-xs font-bold">{nav.label}</span>
          </button>
        ))}
      </div>

      {/* Bid Modal */}
      {biddingJob && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setBiddingJob(null) }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-xs text-gray-400 font-semibold mb-1">{biddingJob.category_name}</p>
            <h3 className="text-gray-800 font-black text-base mb-5 leading-snug">{biddingJob.title}</h3>

            {bidSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center mb-4">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-700 font-black text-sm">{bidSuccess}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bidError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl">
                    {bidError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                    Harga Tawaran (RM) <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#1565C0] transition-all">
                    <span className="text-gray-400 font-bold mr-2 text-sm">RM</span>
                    <input type="number" min="1" placeholder="cth: 150"
                      value={bidForm.proposed_price}
                      onChange={e => setBidForm(p => ({ ...p, proposed_price: e.target.value }))}
                      className="flex-1 text-lg text-gray-800 outline-none bg-transparent font-black" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                    Anggaran Masa Siap <span className="normal-case font-normal text-gray-400">(pilihan)</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['30 minit', '1 jam', '2-3 jam', 'Setengah hari', '1 hari'].map(d => (
                      <button key={d} type="button"
                        onClick={() => setBidForm(p => ({ ...p, estimated_duration: p.estimated_duration === d ? '' : d }))}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all
                          ${bidForm.estimated_duration === d ? 'border-[#1565C0] bg-blue-50 text-[#1565C0]' : 'border-slate-200 text-gray-500'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                    Mesej <span className="normal-case font-normal text-gray-400">(pilihan)</span>
                  </label>
                  <textarea value={bidForm.message}
                    onChange={e => setBidForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="cth: Saya ada pengalaman 5 tahun. Boleh datang hari ini..."
                    rows={3}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1565C0] transition-all resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setBiddingJob(null)}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-black hover:bg-gray-50 transition">
                    Batal
                  </button>
                  <button type="button" onClick={handleBidSubmit} disabled={bidLoading}
                    className="flex-1 py-3 rounded-2xl text-white text-sm font-black transition-all disabled:opacity-60 hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
                    {bidLoading ? 'Menghantar...' : 'Hantar Tawaran'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
