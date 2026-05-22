'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

const bgStyle = {
  background: '#0a1628',
  backgroundImage: `repeating-linear-gradient(
    45deg,
    transparent,
    transparent 40px,
    rgba(255,255,255,0.015) 40px,
    rgba(255,255,255,0.015) 80px
  )`
}

export default function RegisterPickerPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  // If already logged in, clicking logo goes to dashboard
  const homePath =
    user?.role === 'provider' ? '/provider/dashboard'
    : user?.role === 'admin'  ? '/admin/dashboard'
    : '/'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={bgStyle}>

      {/* Logo */}
      <button onClick={() => router.push(homePath)} className="mb-8 text-center">
        <img
          src="/logo.png"
          alt="Fixla"
          className="h-16 w-auto mx-auto mb-3"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(249,115,22,0.6))' }}
        />
        <p className="text-slate-400 text-xs tracking-widest uppercase">Daftar Akaun Percuma</p>
      </button>

      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-2">
          <h1 className="text-white font-black text-2xl mb-1">Saya ingin...</h1>
          <p className="text-slate-400 text-xs">Pilih jenis akaun yang sesuai dengan anda</p>
        </div>

        {/* Pelanggan card */}
        <Link href="/register/customer"
          className="block bg-white rounded-3xl p-6 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl shrink-0">
              🏠
            </div>
            <div className="flex-1">
              <p className="text-[#1565C0] text-xs font-black uppercase tracking-widest mb-0.5">Pelanggan</p>
              <h2 className="text-gray-900 font-black text-lg leading-tight mb-1">Cari Servis</h2>
              <p className="text-gray-400 text-xs leading-relaxed">
                Post job, terima tawaran harga dari Technician berdekatan dan pilih yang terbaik
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-1 text-[#1565C0] text-xs font-black">
            Daftar sebagai Pelanggan
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Provider card */}
        <Link href="/register/provider"
          className="block rounded-3xl p-6 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -right-1 -bottom-5 w-16 h-16 bg-white/10 rounded-full pointer-events-none" />
          <div className="flex items-start gap-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-3xl shrink-0">
              🔧
            </div>
            <div className="flex-1">
              <p className="text-orange-100 text-xs font-black uppercase tracking-widest mb-0.5">Technician</p>
              <h2 className="text-white font-black text-lg leading-tight mb-1">Tawarkan Servis</h2>
              <p className="text-orange-100 text-xs leading-relaxed">
                Jana pendapatan dengan menerima job berdekatan kawasan operasi anda
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-1 text-white text-xs font-black relative">
            Daftar sebagai Technician
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Login link */}
        <p className="text-center text-sm text-slate-400 pt-2">
          Sudah ada akaun?{' '}
          <Link href="/login" className="text-[#F97316] font-black hover:underline">
            Log Masuk
          </Link>
        </p>
      </div>

      <p className="text-slate-600 text-xs mt-8">Fixla · Professional &amp; Reliable</p>
    </div>
  )
}
