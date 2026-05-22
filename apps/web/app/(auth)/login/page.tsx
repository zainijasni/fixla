'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  phone: z.string().min(1, 'Nombor telefon diperlukan'),
  password: z.string().min(1, 'Kata laluan diperlukan')
})

type LoginForm = z.infer<typeof schema>

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

// Normalise phone: strip leading 0, return digits only (e.g. "0123456789" → "123456789")
const normalisePhone = (raw: string) => raw.replace(/\D/g, '').replace(/^0/, '')

export default function LoginPage() {
  const router = useRouter()
  const { login, user } = useAuthStore()
  const [apiError, setApiError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const homePath =
    user?.role === 'provider' ? '/provider/dashboard'
    : user?.role === 'admin'  ? '/admin/dashboard'
    : '/'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: LoginForm) => {
    setApiError('')
    try {
      const phone = normalisePhone(data.phone)
      await login(phone, data.password)
      const u = useAuthStore.getState().user
      if (u?.role === 'provider') router.push('/provider/dashboard')
      else if (u?.role === 'admin') router.push('/admin/dashboard')
      else router.push('/')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setApiError(e?.response?.data?.error?.message || 'Log masuk gagal. Cuba semula.')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: '#0a1628',
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 40px,
          rgba(255,255,255,0.015) 40px,
          rgba(255,255,255,0.015) 80px
        )`
      }}
    >
      {/* Logo */}
      <button onClick={() => router.push(homePath)} className="mb-6 text-center">
        <img src="/logo.png" alt="Fixla" className="h-20 w-auto mx-auto mb-4"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(249,115,22,0.6))' }} />
        <p className="text-slate-400 text-xs tracking-widest uppercase">Home Repair Service</p>
      </button>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <h2 className="text-xl font-black text-gray-900 mb-1">Log Masuk</h2>
        <p className="text-gray-400 text-xs mb-7">Masukkan maklumat akaun anda untuk teruskan</p>

        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl mb-4">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
          {/* Phone */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              Nombor Telefon
            </label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#1565C0] focus-within:bg-white transition-all">
              <svg className="w-4 h-4 text-slate-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-slate-400 text-sm font-semibold mr-1">+60</span>
              <div className="w-px h-4 bg-slate-200 mx-2" />
              <input
                {...register('phone')}
                type="tel"
                placeholder="123456789"
                autoComplete="off"
                readOnly
                onFocus={e => e.currentTarget.removeAttribute('readonly')}
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent font-medium"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-1">Tanpa awalan 0 — contoh: 123456789</p>
            {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              Kata Laluan
            </label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#1565C0] focus-within:bg-white transition-all">
              <svg className="w-4 h-4 text-slate-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="Masukkan kata laluan"
                autoComplete="new-password"
                readOnly
                onFocus={e => e.currentTarget.removeAttribute('readonly')}
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent font-medium"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="text-slate-400 hover:text-slate-600 transition ml-2 shrink-0">
                <EyeIcon open={showPw} />
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full text-white rounded-2xl py-3.5 font-black text-sm transition-all disabled:opacity-60 hover:opacity-90 active:scale-95 mt-2"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA6C0A)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
            {isSubmitting ? 'Sedang log masuk...' : 'Log Masuk'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-gray-400 text-xs font-medium">ATAU</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <p className="text-center text-sm text-gray-500">
          Belum ada akaun?{' '}
          <Link href="/register" className="text-[#F97316] font-black hover:underline">
            Daftar Sekarang
          </Link>
        </p>
      </div>

      <p className="text-slate-600 text-xs mt-6">Fixla · Professional &amp; Reliable</p>
    </div>
  )
}
