'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

export default function CustomerSettingsPage() {
  const router = useRouter()
  const { user, fetchMe, logout } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [showCurPw, setShowCurPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    setName(user.full_name || '')
    setEmail(user.email || '')
  }, [user, router])

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMsg('')
    setSaveError('')
    try {
      await api.patch('/api/users/me', {
        full_name: name,
        ...(email ? { email } : {})
      })
      await fetchMe()
      setSaveMsg('Profil berjaya dikemaskini!')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setSaveError(e?.response?.data?.error?.message || 'Gagal menyimpan. Cuba semula.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { setPwError('Kata laluan baru tidak sepadan'); return }
    if (newPw.length < 8) { setPwError('Kata laluan baru minimum 8 aksara'); return }
    setPwSaving(true)
    setPwMsg('')
    setPwError('')
    try {
      await api.patch('/api/users/me/password', {
        current_password: curPw,
        new_password: newPw
      })
      setPwMsg('Kata laluan berjaya ditukar!')
      setCurPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => setPwMsg(''), 3000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setPwError(e?.response?.data?.error?.message || 'Gagal tukar kata laluan.')
    } finally {
      setPwSaving(false)
    }
  }

  const inputClass = "w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1565C0] transition-all font-medium"

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-10 pb-16">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-white/60 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-0.5">Akaun</p>
            <h1 className="text-white font-black text-xl">Tetapan Profil</h1>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-8 pb-10 space-y-4">

        {/* Avatar */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center font-black text-[#1565C0] text-2xl shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-black text-gray-800 text-base">{user?.full_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{user?.phone}</p>
            <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1565C0]">
              Pelanggan
            </span>
          </div>
        </div>

        {/* Edit profile */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Maklumat Diri</h2>

          {saveMsg && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-xs text-green-700 font-semibold">
              ✅ {saveMsg}
            </div>
          )}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-600 font-semibold">
              ⚠️ {saveError}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nama Penuh</label>
            <input value={name} onChange={e => setName(e.target.value)} type="text"
              placeholder="Nama penuh anda" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              E-mel <span className="normal-case font-normal text-gray-400">(pilihan)</span>
            </label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="contoh@email.com" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nombor Telefon</label>
            <input value={user?.phone || ''} disabled type="tel"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-400 outline-none cursor-not-allowed font-medium" />
            <p className="text-xs text-gray-400 mt-1 ml-1">Nombor telefon tidak boleh ditukar</p>
          </div>

          <button onClick={handleSaveProfile} disabled={saving || !name.trim()}
            className="w-full py-3.5 rounded-2xl text-white font-black text-sm transition-all disabled:opacity-50 hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)', boxShadow: '0 6px 20px rgba(249,115,22,0.3)' }}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Tukar Kata Laluan</h2>

          {pwMsg && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-xs text-green-700 font-semibold">
              ✅ {pwMsg}
            </div>
          )}
          {pwError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-600 font-semibold">
              ⚠️ {pwError}
            </div>
          )}

          {[
            { label: 'Kata Laluan Semasa', val: curPw, set: setCurPw, show: showCurPw, toggle: () => setShowCurPw(v => !v), ph: 'Kata laluan semasa' },
            { label: 'Kata Laluan Baru', val: newPw, set: setNewPw, show: showNewPw, toggle: () => setShowNewPw(v => !v), ph: 'Minimum 8 aksara' },
            { label: 'Sahkan Kata Laluan Baru', val: confirmPw, set: setConfirmPw, show: showConfirmPw, toggle: () => setShowConfirmPw(v => !v), ph: 'Taip semula kata laluan baru' },
          ].map(({ label, val, set, show, toggle, ph }) => (
            <div key={label}>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">{label}</label>
              <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#1565C0] transition-all">
                <input value={val} onChange={e => set(e.target.value)} type={show ? 'text' : 'password'}
                  placeholder={ph} autoComplete="new-password"
                  className="flex-1 text-sm text-gray-800 outline-none bg-transparent font-medium" />
                <button type="button" onClick={toggle}
                  className="text-slate-400 hover:text-slate-600 transition ml-2 shrink-0">
                  <EyeIcon open={show} />
                </button>
              </div>
            </div>
          ))}

          <button onClick={handleChangePassword} disabled={pwSaving || !curPw || !newPw || !confirmPw}
            className="w-full py-3.5 rounded-2xl font-black text-sm transition-all disabled:opacity-50 hover:opacity-90 active:scale-95 text-[#1565C0] border-2 border-[#1565C0] hover:bg-blue-50">
            {pwSaving ? 'Menukar...' : 'Tukar Kata Laluan'}
          </button>
        </div>

        {/* Logout */}
        <button onClick={() => { logout(); router.push('/login') }}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-red-500 border-2 border-red-100 hover:bg-red-50 transition">
          Log Keluar
        </button>
      </div>
    </div>
  )
}
