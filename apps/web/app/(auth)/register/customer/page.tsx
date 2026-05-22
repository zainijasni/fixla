'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  full_name: z.string().min(2, 'Nama diperlukan'),
  phone: z.string().min(8, 'Nombor telefon tidak sah'),
  email: z.string().email('E-mel tidak sah').optional().or(z.literal('')),
  password: z.string().min(8, 'Kata laluan minimum 8 aksara')
})

type RegisterForm = z.infer<typeof schema>

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

const normalisePhone = (raw: string) => raw.replace(/\D/g, '').replace(/^0/, '')

export default function RegisterCustomerPage() {
  const router = useRouter()
  const registerCustomer = useAuthStore((s) => s.registerCustomer)
  const [apiError, setApiError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: RegisterForm) => {
    setApiError('')
    try {
      await registerCustomer({
        full_name: data.full_name,
        phone: normalisePhone(data.phone),
        email: data.email || undefined,
        password: data.password
      })
      router.push('/')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setApiError(e?.response?.data?.error?.message || 'Pendaftaran gagal. Cuba semula.')
    }
  }

  const inputBox = "flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#1565C0] focus-within:bg-white transition-all"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={bgStyle}>

      <button onClick={() => router.push('/register')} className="mb-6 text-center">
        <img src="/logo.png" alt="Fixla" className="h-16 w-auto mx-auto mb-3"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(249,115,22,0.6))' }} />
        <p className="text-slate-400 text-xs tracking-widest uppercase">Daftar Akaun Pelanggan</p>
      </button>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <button onClick={() => router.push('/register')}
          className="flex items-center gap-1 text-gray-400 text-xs font-bold mb-5 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Tukar jenis akaun
        </button>

        <h2 className="text-xl font-black text-gray-900 mb-1">Daftar sebagai Pelanggan</h2>
        <p className="text-gray-400 text-xs mb-6">Isi maklumat di bawah untuk mendaftar</p>

        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl mb-4">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">

          {/* Nama */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nama Penuh</label>
            <div className={inputBox}>
              <svg className="w-4 h-4 text-slate-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input {...register('full_name')} type="text" placeholder="cth: Ahmad Ali"
                autoComplete="name"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent font-medium" />
            </div>
            {errors.full_name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.full_name.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nombor Telefon</label>
            <div className={inputBox}>
              <svg className="w-4 h-4 text-slate-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-slate-400 text-sm font-semibold mr-1">+60</span>
              <div className="w-px h-4 bg-slate-200 mx-2" />
              <input {...register('phone')} type="tel" placeholder="123456789"
                autoComplete="off"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent font-medium" />
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-1">Tanpa awalan 0 — contoh: 123456789</p>
            {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              E-mel <span className="normal-case font-normal text-gray-400">(tidak wajib)</span>
            </label>
            <div className={inputBox}>
              <svg className="w-4 h-4 text-slate-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input {...register('email')} type="email" placeholder="contoh@email.com"
                autoComplete="off"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent font-medium" />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Kata Laluan</label>
            <div className={inputBox}>
              <svg className="w-4 h-4 text-slate-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Minimum 8 aksara"
                autoComplete="new-password"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent font-medium" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="text-slate-400 hover:text-slate-600 transition ml-2 shrink-0">
                <EyeIcon open={showPw} />
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full text-white rounded-2xl py-3.5 font-black text-sm transition-all disabled:opacity-60 hover:opacity-90 active:scale-95 mt-2"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA6C0A)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
            {isSubmitting ? 'Sedang mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-500">
            Sudah ada akaun?{' '}
            <Link href="/login" className="text-[#1565C0] font-black hover:underline">Log Masuk</Link>
          </p>
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-6">Fixla · Professional &amp; Reliable</p>
    </div>
  )
}
