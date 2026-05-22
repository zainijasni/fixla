'use client'
import { useAuthStore } from '@/store/auth.store'

export const useAuth = () => {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  return { user, token, logout, isAuthenticated: !!token, isProvider: user?.role === 'provider', isAdmin: user?.role === 'admin' }
}
