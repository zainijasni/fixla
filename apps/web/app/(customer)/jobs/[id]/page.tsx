'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'


interface Job {
  id: string
  title: string
  description: string
  category_name: string
  location_address: string
  state: string
  city: string
  postcode: string
  urgency: 'urgent' | 'normal' | 'flexible'
  preferred_date?: string
  preferred_time?: string
  budget_min?: number
  budget_max?: number
  status: string
  created_at: string
}

interface Bid {
  id: string
  provider_id: string
  proposed_price: number
  estimated_duration?: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  business_name: string
  full_name: string
  rating_avg: number
  total_reviews: number
  avatar_url?: string
  created_at: string
}

const URGENCY = {
  urgent:   { label: 'Urgent',    color: 'bg-red-100 text-red-600',       icon: '🔴' },
  normal:   { label: 'Normal',    color: 'bg-yellow-100 text-yellow-700',  icon: '🟡' },
  flexible: { label: 'Fleksibel', color: 'bg-green-100 text-green-700',    icon: '🟢' },
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  open:        { label: 'Menunggu Tawaran',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    icon: '⏳', desc: 'Technician sedang menyemak job anda' },
  bidding:     { label: 'Ada Tawaran!',          color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '🔔', desc: 'Semak dan terima tawaran terbaik' },
  assigned:    { label: 'Technician Dipilih',    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: '✅', desc: 'Technician akan menghubungi anda' },
  otw:         { label: 'Technician OTW',        color: 'text-cyan-700',   bg: 'bg-cyan-50 border-cyan-200',    icon: '🚗', desc: 'Technician sedang dalam perjalanan ke lokasi anda' },
  in_progress: { label: 'Kerja Berjalan',        color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: '🔧', desc: 'Technician sedang menyelesaikan kerja anda' },
  completed:   { label: 'Selesai',               color: 'text-green-700',  bg: 'bg-green-50 border-green-200',    icon: '🎉', desc: 'Kerja telah selesai dengan jayanya' },
  cancelled:   { label: 'Dibatalkan',            color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',      icon: '❌', desc: 'Job ini telah dibatalkan' },
}

const PROGRESS_STEPS = ['open', 'bidding', 'assigned', 'otw', 'in_progress', 'completed']
const STEP_LABELS = ['Hantar', 'Tawaran', 'Terima', 'OTW', 'Proses', 'Siap']

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, token } = useAuthStore()

  const [job, setJob] = useState<Job | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [paymentModal, setPaymentModal] = useState<{ price: number } | null>(null)
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form')
  const justPosted = searchParams.get('posted') === '1'

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, bidsRes] = await Promise.all([
        api.get(`/api/jobs/${params.id}`),
        api.get(`/api/bids/jobs/${params.id}`)
      ])
      setJob(jobRes.data)
      setBids(bidsRes.data.bids || [])

      // Find conversation for post-acceptance statuses
      if (['assigned', 'otw', 'in_progress', 'completed'].includes(jobRes.data.status)) {
        api.get('/api/conversations').then(({ data }) => {
          const conv = (data.conversations || []).find(
            (c: { job_id: string }) => c.job_id === params.id
          )
          if (conv) setConversationId(conv.id)
        }).catch(() => {})
      }
    } catch {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    fetchData()
  }, [user, router, fetchData])

  // Live status updates when technician changes status
  useEffect(() => {
    if (!token) return
    const socket = getSocket(token)
    socket.on('job_status_update', (data: { job_id: string; status: string }) => {
      if (data.job_id === params.id) fetchData()
    })
    return () => { socket.off('job_status_update') }
  }, [token, params.id, fetchData])

  const handleAccept = async (bidId: string) => {
    setAccepting(bidId)
    try {
      const { data } = await api.patch(`/api/bids/${bidId}/accept`)
      if (data.conversation_id) setConversationId(data.conversation_id)
      const acceptedPrice = bids.find(b => b.id === bidId)?.proposed_price || 0
      fetchData()
      setPaymentStep('form')
      setPaymentModal({ price: acceptedPrice })
    } catch {
      alert('Gagal terima tawaran. Cuba semula.')
    } finally {
      setAccepting(null)
    }
  }

  const handleSimulatePayment = async () => {
    setPaymentStep('processing')
    await new Promise(resolve => setTimeout(resolve, 2200))
    setPaymentStep('success')
  }

  const handleReject = async (bidId: string) => {
    try {
      await api.patch(`/api/bids/${bidId}/reject`)
      fetchData()
    } catch {
      alert('Gagal tolak tawaran.')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!job) return null

  const urgencyInfo = URGENCY[job.urgency]
  const statusInfo = STATUS_MAP[job.status] || { label: job.status, color: 'bg-gray-100 text-gray-500' }
  const pendingBids = bids.filter(b => b.status === 'pending')
  const acceptedBid = bids.find(b => b.status === 'accepted')
  const canAccept = ['open', 'bidding'].includes(job.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-10 pb-20">
        <div className="flex items-center justify-between mb-5">
          <Link href="/jobs" className="text-white/70 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/">
            <img src="/logo.png" alt="Fixla" className="h-8 w-auto"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.5))' }} />
          </Link>
          <div className="w-5" />
        </div>
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">{job.category_name}</p>
        <h1 className="text-white font-black text-xl leading-tight">{job.title}</h1>
      </div>

      <div className="px-5 -mt-12 pb-8 space-y-4">

        {/* ── BIG STATUS BANNER ── */}
        <div className={`border-2 rounded-3xl p-5 ${statusInfo.bg}`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-4xl">{statusInfo.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-0.5">Status Job</p>
              <p className={`text-2xl font-black leading-tight ${statusInfo.color}`}>{statusInfo.label}</p>
              <p className="text-xs text-gray-500 mt-1">{statusInfo.desc}</p>
            </div>
          </div>
          {/* Progress steps */}
          <div className="mt-4 flex items-center gap-1">
            {PROGRESS_STEPS.map((s, i) => {
              const currentIdx = PROGRESS_STEPS.indexOf(job.status)
              const done = i <= currentIdx
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`h-2 rounded-full flex-1 transition-all ${done ? 'bg-current opacity-70' : 'bg-gray-200'}`}
                    style={done ? {} : {}} />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            {STEP_LABELS.map((l, i) => (
              <span key={l} className="text-xs text-gray-400 font-semibold"
                style={{ width: `${100 / STEP_LABELS.length}%`, textAlign: i === 0 ? 'left' : i === STEP_LABELS.length - 1 ? 'right' : 'center' }}>
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Just posted */}
        {justPosted && (
          <div className="bg-green-50 border border-green-200 rounded-3xl p-4 flex items-center gap-3">
            <span className="text-2xl">🎊</span>
            <div>
              <p className="text-green-700 font-black text-sm">Job berjaya dihantar!</p>
              <p className="text-green-600 text-xs mt-0.5">Technician berdekatan akan menghantar tawaran tidak lama lagi.</p>
            </div>
          </div>
        )}

        {/* Job info */}
        <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-3 py-1.5 rounded-full ${urgencyInfo.color}`}>
              {urgencyInfo.icon} {urgencyInfo.label}
            </span>
          </div>

          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Penerangan</p>
            <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="space-y-3">
            <InfoRow icon="📍" label="Lokasi" value={`${job.location_address}, ${job.city}, ${job.state}`} />
            {job.preferred_date && (
              <InfoRow icon="📅" label="Tarikh"
                value={new Date(job.preferred_date).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            {job.preferred_time && (
              <InfoRow icon="🕐" label="Masa"
                value={{ morning: 'Pagi (8am–12pm)', afternoon: 'Tengahari (12–5pm)', evening: 'Petang (5–9pm)', anytime: 'Bila-bila masa' }[job.preferred_time] || job.preferred_time} />
            )}
            {(job.budget_min || job.budget_max) && (
              <InfoRow icon="💰" label="Bajet"
                value={job.budget_min && job.budget_max
                  ? `RM ${job.budget_min} – RM ${job.budget_max}`
                  : job.budget_min ? `Dari RM ${job.budget_min}` : `Sehingga RM ${job.budget_max}`} />
            )}
          </div>
        </div>

        {/* Accepted bid */}
        {acceptedBid && (
          <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5">
            <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-3">✅ Tawaran Diterima</p>
            <BidCard bid={acceptedBid} accepted />
          </div>
        )}

        {/* Chat button — shown from assigned onwards */}
        {['assigned', 'otw', 'in_progress'].includes(job.status) && conversationId && (
          <Link href={`/chat/${conversationId}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-black text-sm transition-all hover:opacity-90 active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#1565C0,#0D47A1)', boxShadow: '0 8px 24px rgba(21,101,192,0.3)' }}>
            💬 Chat dengan Technician
          </Link>
        )}

        {/* Pending bids */}
        {canAccept && pendingBids.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                Tawaran Diterima ({pendingBids.length})
              </p>
              <button onClick={fetchData} className="text-xs text-[#1565C0] font-bold">Refresh</button>
            </div>
            {pendingBids.map(bid => (
              <div key={bid.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                <BidCard bid={bid} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleReject(bid.id)}
                    className="flex-1 py-2.5 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-black hover:bg-gray-50 transition">
                    Tolak
                  </button>
                  <button onClick={() => handleAccept(bid.id)} disabled={accepting === bid.id}
                    className="flex-2 px-6 py-2.5 rounded-2xl text-white text-sm font-black transition-all disabled:opacity-60 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
                    {accepting === bid.id ? 'Memproses...' : '✓ Terima Tawaran'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No bids yet */}
        {canAccept && pendingBids.length === 0 && !acceptedBid && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
            <div className="text-3xl mb-3">⏳</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Menunggu tawaran technician...</p>
            <p className="text-xs text-gray-400 mb-4">Technician berdekatan sedang menyemak job anda</p>
            <button onClick={fetchData}
              className="px-5 py-2 text-xs font-black text-[#1565C0] border-2 border-[#1565C0] rounded-xl hover:bg-blue-50 transition">
              Refresh
            </button>
          </div>
        )}

        <Link href="/jobs/new"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-bold hover:border-[#F97316] hover:text-[#F97316] transition">
          + Post Job Lain
        </Link>
      </div>

      {/* Payment simulation modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
          <div className="w-full bg-white rounded-t-3xl shadow-2xl">
            {paymentStep === 'form' && (
              <div className="p-6">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Selamatkan Job Anda</p>
                <h3 className="font-black text-gray-800 text-xl mb-5">Bayaran Escrow</h3>

                <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#1565C0,#0D47A1)' }}>
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
                  <div className="absolute -right-2 bottom-0 w-16 h-16 bg-white/10 rounded-full" />
                  <div className="relative">
                    <p className="text-xs text-white/60 mb-1 uppercase tracking-widest">Jumlah Bayaran</p>
                    <p className="text-4xl font-black">RM {paymentModal.price}</p>
                    <p className="text-white/60 text-xs mt-2">Dijamin dalam Akaun Escrow</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5 flex gap-3">
                  <span className="text-xl shrink-0">🔒</span>
                  <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                    Dana disimpan selamat dalam sistem Escrow. Wang hanya dilepaskan kepada Technician apabila kerja selesai dan anda mengesahkan.
                  </p>
                </div>

                <button onClick={handleSimulatePayment}
                  className="w-full py-4 rounded-2xl text-white font-black text-base transition-all hover:opacity-90 active:scale-95 mb-2"
                  style={{ background: 'linear-gradient(135deg,#1D9E75,#158f67)', boxShadow: '0 8px 24px rgba(29,158,117,0.3)' }}>
                  💳 Bayar RM {paymentModal.price} Sekarang
                </button>
                <button onClick={() => setPaymentModal(null)}
                  className="w-full py-3 text-gray-400 text-xs font-bold">
                  Bayar Kemudian
                </button>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="p-6 py-14 text-center">
                <div className="w-16 h-16 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                <p className="text-gray-800 font-black text-lg">Memproses Bayaran...</p>
                <p className="text-gray-400 text-xs mt-1">Sila tunggu sebentar</p>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="p-6 py-10 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <p className="text-green-700 font-black text-2xl mb-1">Bayaran Berjaya!</p>
                <p className="text-gray-500 text-sm mb-1">RM {paymentModal.price} dijamin dalam Escrow</p>
                <p className="text-gray-400 text-xs mb-8">Technician kini boleh menuju ke lokasi anda</p>
                <button onClick={() => { setPaymentModal(null); setPaymentStep('form') }}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
                  Lihat Status Job
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-semibold">{label}</p>
        <p className="text-sm text-gray-700 font-medium">{value}</p>
      </div>
    </div>
  )
}

function BidCard({ bid, accepted = false }: { bid: Bid; accepted?: boolean }) {
  return (
    <div className={accepted ? '' : ''}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-[#1565C0] text-sm">
          {bid.business_name?.charAt(0) || bid.full_name?.charAt(0) || '?'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-gray-800">{bid.business_name || bid.full_name}</p>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-gray-500 font-semibold">
              {bid.rating_avg > 0 ? bid.rating_avg.toFixed(1) : 'Baru'}
              {bid.total_reviews > 0 && ` (${bid.total_reviews} ulasan)`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-[#F97316]">RM {bid.proposed_price}</p>
          {bid.estimated_duration && (
            <p className="text-xs text-gray-400">{bid.estimated_duration}</p>
          )}
        </div>
      </div>
      {bid.message && (
        <div className="bg-slate-50 rounded-2xl px-4 py-3">
          <p className="text-xs text-gray-600 leading-relaxed">"{bid.message}"</p>
        </div>
      )}
    </div>
  )
}
