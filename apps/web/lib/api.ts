import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fixla_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const url: string = err.config?.url || ''
      const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/register')
      const isAlreadyOnLogin = window.location.pathname === '/login'

      // Only force-logout for protected routes, not for login/register failures
      if (!isAuthRoute && !isAlreadyOnLogin) {
        localStorage.removeItem('fixla_token')
        localStorage.removeItem('fixla_auth')  // clear Zustand persist too
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
