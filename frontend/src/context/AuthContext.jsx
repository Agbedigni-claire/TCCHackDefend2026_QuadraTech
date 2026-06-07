import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

const INACTIVITY_MS    = 30 * 60 * 1000  // 30 min → déconnexion
const WARNING_MS       = 25 * 60 * 1000  // 25 min → avertissement
const REFRESH_AHEAD_MS =  5 * 60 * 1000  //  5 min avant expiry JWT → refresh silencieux

const ACTIVITY_EVENTS = ['mousemove', 'keypress', 'click', 'touchstart', 'scroll']

function decodeJwtExp(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64)).exp * 1000  // ms
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [showWarning, setShowWarning] = useState(false)

  const inactivityRef  = useRef(null)
  const warningRef     = useRef(null)
  const refreshRef     = useRef(null)
  const scheduleRef    = useRef(null)   // évite la dépendance circulaire
  const showWarningRef = useRef(false)  // lu dans les event listeners sans re-abonnement

  useEffect(() => { showWarningRef.current = showWarning }, [showWarning])

  // ── Refresh proactif ────────────────────────────────────────────────────────
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshRef.current)
    const access = localStorage.getItem('access')
    if (!access) return
    const exp = decodeJwtExp(access)
    if (!exp) return
    const delay = Math.max(0, exp - Date.now() - REFRESH_AHEAD_MS)

    const doRefresh = async () => {
      const refresh = localStorage.getItem('refresh')
      if (!refresh) return
      try {
        const { data } = await api.post('/api/token/refresh/', { refresh })
        localStorage.setItem('access', data.access)
        if (data.refresh) localStorage.setItem('refresh', data.refresh)
      } catch { /* expire naturellement, axios interceptor gèrera le 401 */ }
      scheduleRef.current?.()
    }

    refreshRef.current = setTimeout(doRefresh, delay)
  }, [])

  useEffect(() => { scheduleRef.current = scheduleRefresh }, [scheduleRefresh])

  // ── Déconnexion ─────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearTimeout(inactivityRef.current)
    clearTimeout(warningRef.current)
    clearTimeout(refreshRef.current)
    localStorage.clear()
    setUser(null)
    setShowWarning(false)
  }, [])

  // ── Inactivité ──────────────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityRef.current)
    clearTimeout(warningRef.current)
    setShowWarning(false)
    warningRef.current    = setTimeout(() => setShowWarning(true), WARNING_MS)
    inactivityRef.current = setTimeout(logout, INACTIVITY_MS)
  }, [logout])

  // Étend la session depuis le modal d'avertissement
  const extendSession = useCallback(() => {
    resetInactivityTimer()
  }, [resetInactivityTimer])

  useEffect(() => {
    if (!user) return
    resetInactivityTimer()

    // Activité : reset seulement si le modal n'est pas affiché
    // (l'utilisateur doit cliquer explicitement "Continuer" pour le fermer)
    const onActivity = () => {
      if (!showWarningRef.current) resetInactivityTimer()
    }
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity))
      clearTimeout(inactivityRef.current)
      clearTimeout(warningRef.current)
    }
  }, [user, resetInactivityTimer])

  // ── Initialisation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (localStorage.getItem('access')) {
      api.get('/api/users/me/')
        .then(({ data }) => { setUser(data); scheduleRefresh() })
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [scheduleRefresh])

  async function login(username, password) {
    const { data } = await api.post('/api/token/', { username, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    const { data: me } = await api.get('/api/users/me/')
    setUser(me)
    scheduleRefresh()
  }

  if (loading) return null

  return (
    <AuthContext.Provider value={{ user, login, logout, showWarning, extendSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
