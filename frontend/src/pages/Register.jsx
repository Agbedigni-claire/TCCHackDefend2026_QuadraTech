import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.jpg'

export default function Register() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm: '', role: 'proprietaire',
  })
  const [error, setError] = useState(null)
  const [busy, setBusy]   = useState(false)

  function field(name) {
    return { value: form[name], onChange: e => setForm({ ...form, [name]: e.target.value }) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setBusy(true)
    try {
      const { username, email, password, role } = form
      await api.post('/api/users/register/', { username, email, password, role })
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(m => `${k} : ${m}`))
        setError(msgs.join(' '))
      } else {
        setError("Erreur lors de l'inscription. Veuillez réessayer.")
      }
      setBusy(false)
      return
    }
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch {
      // Inscription réussie mais connexion auto échouée — rediriger vers login
      navigate('/login')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={logo} alt="TrustLand" className="auth-logo" />
        <p className="auth-sub">Créer un compte</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input className="form-control" {...field('username')} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" {...field('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input type="password" className="form-control" {...field('password')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <input type="password" className="form-control" {...field('confirm')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Rôle</label>
            <select className="form-control" {...field('role')}>
              <option value="proprietaire">Propriétaire</option>
            </select>
          </div>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Création…' : 'Créer le compte'}
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
