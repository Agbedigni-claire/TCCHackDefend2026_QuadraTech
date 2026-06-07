import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const WARNING_DURATION_S = 5 * 60  // doit correspondre à INACTIVITY_MS - WARNING_MS dans AuthContext

export default function SessionWarning() {
  const { showWarning, extendSession, logout } = useAuth()
  const [seconds, setSeconds] = useState(WARNING_DURATION_S)

  useEffect(() => {
    if (!showWarning) {
      setSeconds(WARNING_DURATION_S)
      return
    }
    const interval = setInterval(() => {
      setSeconds(s => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [showWarning])

  if (!showWarning) return null

  const min = String(Math.floor(seconds / 60)).padStart(2, '0')
  const sec = String(seconds % 60).padStart(2, '0')

  return (
    <div className="sw-overlay" role="dialog" aria-modal="true" aria-labelledby="sw-title">
      <div className="sw-modal">
        <div className="sw-icon" aria-hidden="true">⏱</div>
        <h2 id="sw-title" className="sw-title">Session expirante</h2>
        <p className="sw-message">
          Votre session va expirer dans{' '}
          <span className="sw-countdown">{min}:{sec}</span>{' '}
          en raison d'inactivité.
        </p>
        <div className="sw-actions">
          <button className="btn-primary" onClick={extendSession} autoFocus>
            Continuer la session
          </button>
          <button className="btn-ghost" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
