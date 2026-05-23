import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const token  = localStorage.getItem('hq_token')
    const cached = localStorage.getItem('hq_user')
    if (!token) { setLoading(false); return }
    if (cached) {
      try { setUser(JSON.parse(cached)) } catch (_) {}
    }
    authApi.me()
      .then((res) => {
        setUser(res.data.user)
        localStorage.setItem('hq_user', JSON.stringify(res.data.user))
      })
      .catch(() => {
        localStorage.removeItem('hq_token')
        localStorage.removeItem('hq_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Returns the user object on success, throws a string message on failure
  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    const { token, user: u } = res.data

    if (!['super_admin', 'facility_admin'].includes(u.role)) {
      throw new Error('Access denied. This portal is for admin staff only.')
    }

    localStorage.setItem('hq_token', token)
    localStorage.setItem('hq_user', JSON.stringify(u))
    setUser(u)
    return u
  }

  const logout = () => {
    localStorage.removeItem('hq_token')
    localStorage.removeItem('hq_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
