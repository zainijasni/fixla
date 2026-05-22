export const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('fixla_token') : null

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') localStorage.setItem('fixla_token', token)
}

export const removeToken = () => {
  if (typeof window !== 'undefined') localStorage.removeItem('fixla_token')
}

export const isAuthenticated = () => !!getToken()
