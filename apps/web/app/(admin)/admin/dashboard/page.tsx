'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface Stats { total_users:number; total_providers:number; total_customers:number; total_jobs:number; jobs_completed:number; jobs_open:number; new_users_today:number; new_jobs_today:number }
interface User  { id:string; full_name:string; phone:string; email?:string; role:string; is_verified:boolean; created_at:string; provider_profile_id?:string; business_name?:string; verification_status?:string }
interface Job   { id:string; title:string; status:string; customer_name:string; created_at:string; state:string; bids_count?:number }
interface Conv  { id:string; job_title:string; job_status:string; customer_name:string; provider_name:string; message_count:number; last_message?:string; last_message_at?:string; created_at:string }

type Tab = 'overview'|'providers'|'customers'|'jobs'|'chats'

const VSTATUS: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  verified: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}
const JOB_STATUS: Record<string, {label:string;color:string}> = {
  open:       {label:'Terbuka',      color:'bg-blue-50 text-blue-700'},
  bidding:    {label:'Ada Tawaran',  color:'bg-orange-50 text-orange-700'},
  assigned:   {label:'Ditetapkan',  color:'bg-purple-50 text-purple-700'},
  in_progress:{label:'Dalam Proses',color:'bg-indigo-50 text-indigo-700'},
  completed:  {label:'Selesai',     color:'bg-green-50 text-green-700'},
  cancelled:  {label:'Dibatal',     color:'bg-gray-50 text-gray-500'},
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const [stats, setStats]       = useState<Stats|null>(null)
  const [customers, setCustomers] = useState<User[]>([])
  const [providers, setProviders] = useState<User[]>([])
  const [jobs, setJobs]         = useState<Job[]>([])
  const [convs, setConvs]       = useState<Conv[]>([])
  const [tab, setTab]           = useState<Tab>('overview')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [msg, setMsg]           = useState('')
  const [verifying, setVerifying] = useState<string|null>(null)

  // Edit modal
  const [editTarget, setEditTarget]  = useState<User|null>(null)
  const [editName, setEditName]      = useState('')
  const [editEmail, setEditEmail]    = useState('')
  const [editPw, setEditPw]          = useState('')
  const [editSaving, setEditSaving]  = useState(false)
  const [editMsg, setEditMsg]        = useState('')
  const [deleting, setDeleting]      = useState(false)
  const [confirmDel, setConfirmDel]  = useState(false)

  // Job detail modal
  const [jobDetail, setJobDetail]    = useState<Job|null>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'admin') { router.push('/'); return }
    loadAll()
  }, [user])

  const loadAll = async () => {
    setLoading(true); setError('')
    try {
      const [sRes, uRes, jRes, cRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users?limit=200'),
        api.get('/api/admin/jobs?limit=100'),
        api.get('/api/admin/conversations?limit=100'),
      ])
      setStats(sRes.data)
      const all: User[] = uRes.data.users || []
      setCustomers(all.filter(u => u.role === 'customer'))
      setProviders(all.filter(u => u.role === 'provider'))
      setJobs(jRes.data.jobs || [])
      setConvs(cRes.data.conversations || [])
    } catch { setError('Gagal load data. Semak sambungan.') }
    finally   { setLoading(false) }
  }

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const handleVerify = async (p: User, status: 'verified'|'rejected') => {
    if (!p.provider_profile_id) return
    setVerifying(p.provider_profile_id)
    try {
      await api.patch(`/api/admin/providers/${p.provider_profile_id}/verify`, { verification_status: status })
      flash(status === 'verified' ? '✅ Technician disahkan!' : '❌ Technician ditolak')
      loadAll()
    } catch { flash('⚠️ Gagal. Cuba semula.') }
    finally   { setVerifying(null) }
  }

  const openEdit = (u: User) => {
    setEditTarget(u); setEditName(u.full_name); setEditEmail(u.email||''); setEditPw(''); setEditMsg(''); setConfirmDel(false)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setEditSaving(true); setEditMsg('')
    try {
      const body: Record<string,string> = {}
      if (editName !== editTarget.full_name) body.full_name = editName
      if (editEmail !== (editTarget.email||'')) body.email = editEmail
      if (editPw) body.new_password = editPw
      if (!Object.keys(body).length) { setEditMsg('Tiada perubahan.'); setEditSaving(false); return }
      await api.patch(`/api/admin/users/${editTarget.id}`, body)
      setEditMsg('✅ Berjaya!')
      setTimeout(() => { setEditTarget(null); loadAll() }, 1000)
    } catch (e: unknown) {
      const err = e as {response?:{data?:{error?:{message?:string}}}}
      setEditMsg('⚠️ ' + (err?.response?.data?.error?.message || 'Gagal'))
    } finally { setEditSaving(false) }
  }

  const handleDelete = async () => {
    if (!editTarget || !confirmDel) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/users/${editTarget.id}`)
      setEditTarget(null); flash('🗑️ User berjaya dipadam')
      loadAll()
    } catch (e: unknown) {
      const err = e as {response?:{data?:{error?:{message?:string}}}}
      setEditMsg('⚠️ ' + (err?.response?.data?.error?.message || 'Gagal padam'))
    } finally { setDeleting(false) }
  }

  const roleColor = (role: string) =>
    role==='provider' ? 'bg-orange-50 text-[#F97316]' : role==='admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#1565C0]'

  const StatCard = ({label,value,icon,border}:{label:string;value:number;icon:string;border:string}) => (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm ${border}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest leading-tight">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-black text-gray-800">{value ?? 0}</p>
    </div>
  )

  const TABS: {key:Tab; label:string; badge?:number}[] = [
    {key:'overview',  label:'Ringkasan'},
    {key:'providers', label:'Technician', badge: providers.filter(p=>p.verification_status==='pending').length||undefined},
    {key:'customers', label:'Pelanggan'},
    {key:'jobs',      label:'Job'},
    {key:'chats',     label:'Chat'},
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background:'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)'}} className="px-5 pt-10 pb-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Fixla" className="h-8 w-auto" style={{filter:'drop-shadow(0 2px 8px rgba(249,115,22,0.5))'}} />
            <div>
              <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase">Admin Panel</p>
              <h1 className="text-white font-black text-lg">Dashboard</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAll} className="bg-white/15 text-white text-xs font-bold w-9 h-9 rounded-full border border-white/20 hover:bg-white/25 transition flex items-center justify-center">🔄</button>
            <button onClick={()=>{logout();router.push('/login')}} className="bg-white/15 text-white text-xs font-bold px-3 py-2 rounded-full border border-white/20 hover:bg-white/25 transition">Keluar</button>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-10 pb-10 space-y-4">
        {msg && <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">{msg}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 flex justify-between"><span>{error}</span><button onClick={loadAll} className="underline text-xs">Cuba semula</button></div>}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 shadow-sm">
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-black transition relative ${tab===t.key?'bg-[#1565C0] text-white shadow':'text-gray-400 hover:text-gray-600'}`}>
              {t.label}
              {t.badge ? <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-black">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="bg-gray-100 rounded-2xl h-20 animate-pulse"/>)}</div>
        ) : (<>

          {/* ── OVERVIEW ── */}
          {tab==='overview' && (<>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Pengguna"   value={stats?.total_users??0}     icon="👥" border="border-blue-100"/>
              <StatCard label="Technician"  value={stats?.total_providers??0} icon="🔧" border="border-orange-100"/>
              <StatCard label="Pelanggan"  value={stats?.total_customers??0} icon="🙋" border="border-purple-100"/>
              <StatCard label="Jumlah Job" value={stats?.total_jobs??0}      icon="📋" border="border-green-100"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Job Selesai"   value={stats?.jobs_completed??0}  icon="✅" border="border-green-100"/>
              <StatCard label="Job Terbuka"   value={stats?.jobs_open??0}       icon="⏳" border="border-yellow-100"/>
              <StatCard label="User Baru"     value={stats?.new_users_today??0} icon="🆕" border="border-blue-100"/>
              <StatCard label="Job Baru"      value={stats?.new_jobs_today??0}  icon="📬" border="border-orange-100"/>
            </div>
            {providers.filter(p=>p.verification_status==='pending').length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-black text-yellow-800 text-sm">⚠️ {providers.filter(p=>p.verification_status==='pending').length} Technician menunggu pengesahan</p>
                </div>
                <button onClick={()=>setTab('providers')} className="text-xs font-black text-yellow-800 underline">Semak →</button>
              </div>
            )}
          </>)}

          {/* ── PROVIDERS ── */}
          {tab==='providers' && (
            <div className="space-y-3">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Semua Technician ({providers.length})</p>
              {providers.length===0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center"><p className="text-gray-400 text-sm">Tiada Technician berdaftar</p></div>
              ) : providers.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center font-black text-[#F97316] shrink-0">
                      {p.full_name?.charAt(0)?.toUpperCase()||'?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-800 text-sm">{p.full_name}</p>
                      <p className="text-xs text-gray-400">{p.phone}</p>
                      {p.business_name && <p className="text-xs text-gray-500 mt-0.5">🏢 {p.business_name}</p>}
                      <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${VSTATUS[p.verification_status||'pending']}`}>
                        {p.verification_status==='verified'?'✓ Disahkan':p.verification_status==='rejected'?'✗ Ditolak':'⏳ Pengesahan Tertangguh'}
                      </span>
                    </div>
                    <button onClick={()=>openEdit(p)} className="text-xs font-bold text-[#1565C0] border border-[#1565C0] px-2 py-1 rounded-lg hover:bg-blue-50 transition shrink-0">Edit</button>
                  </div>
                  {p.provider_profile_id && p.verification_status==='pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={()=>handleVerify(p,'verified')} disabled={verifying===p.provider_profile_id}
                        className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition">
                        {verifying===p.provider_profile_id?'...':'✅ Sahkan'}
                      </button>
                      <button onClick={()=>handleVerify(p,'rejected')} disabled={verifying===p.provider_profile_id}
                        className="flex-1 py-2 rounded-xl text-xs font-black text-red-600 border-2 border-red-200 hover:bg-red-50 disabled:opacity-50 transition">
                        {verifying===p.provider_profile_id?'...':'❌ Tolak'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── CUSTOMERS ── */}
          {tab==='customers' && (
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Pelanggan ({customers.length})</p>
              {customers.map(u=>(
                <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center font-black text-sm text-[#1565C0] shrink-0">
                    {u.full_name?.charAt(0)?.toUpperCase()||'?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-800 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.phone}</p>
                  </div>
                  <button onClick={()=>openEdit(u)} className="text-xs font-bold text-[#1565C0] border border-[#1565C0] px-2 py-1 rounded-lg hover:bg-blue-50 transition shrink-0">Edit</button>
                </div>
              ))}
            </div>
          )}

          {/* ── JOBS ── */}
          {tab==='jobs' && (
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Semua Job ({jobs.length})</p>
              {jobs.map(j=>{
                const st = JOB_STATUS[j.status]||{label:j.status,color:'bg-gray-50 text-gray-500'}
                return (
                  <div key={j.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-800 truncate">{j.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">👤 {j.customer_name} · 📍 {j.state}</p>
                        <p className="text-xs text-gray-400">{new Date(j.created_at).toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'})}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── CHATS ── */}
          {tab==='chats' && (
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Semua Perbualan ({convs.length})</p>
              {convs.length===0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center"><p className="text-gray-400 text-sm">Tiada perbualan lagi</p></div>
              ) : convs.map(c=>(
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-black text-gray-800 leading-tight truncate flex-1">{c.job_title}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${JOB_STATUS[c.job_status]?.color||'bg-gray-50 text-gray-500'}`}>
                      {JOB_STATUS[c.job_status]?.label||c.job_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>🙋 {c.customer_name}</span>
                    <span>·</span>
                    <span>🔧 {c.provider_name}</span>
                  </div>
                  {c.last_message && (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 truncate">
                      💬 {c.last_message}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">{c.message_count} mesej</p>
                    {c.last_message_at && (
                      <p className="text-xs text-gray-400">{new Date(c.last_message_at).toLocaleDateString('ms-MY',{day:'numeric',month:'short'})}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </>)}
      </div>

      {/* ── EDIT MODAL ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={e=>{if(e.target===e.currentTarget)setEditTarget(null)}}>
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-800 text-base">Edit Akaun</h3>
                <p className="text-xs text-gray-400">{editTarget.phone} · <span className={`font-bold ${roleColor(editTarget.role)}`}>{editTarget.role === 'provider' ? 'Technician' : editTarget.role === 'customer' ? 'Pelanggan' : 'Admin'}</span></p>
              </div>
              <button onClick={()=>setEditTarget(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {editMsg && (
              <div className={`rounded-2xl px-4 py-3 text-xs font-semibold ${editMsg.startsWith('✅')?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{editMsg}</div>
            )}

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nama Penuh</label>
              <input value={editName} onChange={e=>setEditName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#1565C0] transition font-medium"/>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">E-mel <span className="normal-case font-normal text-gray-400">(pilihan)</span></label>
              <input value={editEmail} onChange={e=>setEditEmail(e.target.value)} type="email"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#1565C0] transition font-medium"/>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Kata Laluan Baru <span className="normal-case font-normal text-gray-400">(kosong = tak tukar)</span></label>
              <input value={editPw} onChange={e=>setEditPw(e.target.value)} type="password" placeholder="Min 8 aksara" autoComplete="new-password"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#1565C0] transition font-medium"/>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={()=>setEditTarget(null)} className="flex-1 py-3 rounded-2xl text-sm font-black text-gray-500 border-2 border-gray-200 hover:bg-gray-50 transition">Batal</button>
              <button onClick={handleSaveEdit} disabled={editSaving||!editName.trim()}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition"
                style={{background:'linear-gradient(135deg,#F97316,#EA6C0A)'}}>
                {editSaving?'Menyimpan...':'Simpan'}
              </button>
            </div>

            {/* Delete section */}
            <div className="border-t border-gray-100 pt-4">
              {!confirmDel ? (
                <button onClick={()=>setConfirmDel(true)}
                  className="w-full py-3 rounded-2xl text-sm font-black text-red-500 border-2 border-red-100 hover:bg-red-50 transition">
                  🗑️ Padam Pengguna Ini
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 font-semibold text-center">⚠️ Tindakan ini tidak boleh dibatalkan!</p>
                  <div className="flex gap-2">
                    <button onClick={()=>setConfirmDel(false)} className="flex-1 py-2.5 rounded-2xl text-xs font-black text-gray-500 border-2 border-gray-200 hover:bg-gray-50 transition">Batal</button>
                    <button onClick={handleDelete} disabled={deleting}
                      className="flex-1 py-2.5 rounded-2xl text-xs font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition">
                      {deleting?'Memadam...':'Ya, Padam'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
