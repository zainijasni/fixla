import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (phone: string, password: string) => Promise<void>
  registerCustomer: (data: { full_name: string; phone: string; email?: string; password: string }) => Promise<void>
  registerProvider: (data: { full_name: string; phone: string; email?: string; password: string; business_name: string; categories?: string[] }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

// Keep fixla_token in sync for the axios interceptor
const syncToken = (token: string | null) => {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem('fixla_token', token)
  else localStorage.removeItem('fixla_token')
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (phone, password) => {
        set({ isLoading: true })
        try {
          // Response shape: { success: true, token, user }
          const { data } = await api.post('/api/auth/login', { phone, password })
          syncToken(data.token)
          set({ token: data.token, user: data.user, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      registerCustomer: async (formData) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/api/auth/register/customer', formData)
          syncToken(data.token)
          set({ token: data.token, user: data.user, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      registerProvider: async (formData) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/api/auth/register/provider', formData)
          syncToken(data.token)
          set({ token: data.token, user: data.user, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        api.post('/api/auth/logout').catch(() => null)
        syncToken(null)
        if (typeof window !== 'undefined') localStorage.removeItem('fixla_auth')
        set({ user: null, token: null })
      },

      fetchMe: async () => {
        const { data } = await api.get('/api/users/me')
        set({ user: data.user })
      }
    }),
    {
      name: 'fixla_auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) syncToken(state.token)
      }
    }
  )
)
