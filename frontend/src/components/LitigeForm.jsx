import { useEffect, useState } from 'react'
import api from '../api/client'

const EMPTY = { terrain: '', declarant: '', description: '' }

/**
 * Formulaire standalone de déclaration de litige.
 * Props :
 *   onSuccess — callback appelé ~1,5 s après une soumission réussie
 */
export default function LitigeForm({ onSuccess }) {
  const [form,          setForm]          = useState(EMPTY)
  const [terrains,      setTerrains]      = useState([])
  const [proprietaires, setProprietaires] = useState([])
  const [status,        setStatus]        = useState(null)
  const [errMsg,        setErrMsg]        = useState('')
  const [busy,          setBusy]          = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/terrains/'),
      api.get('/api/proprietaires/'),
    ]).then(([tRes, pRes]) => {
      setTerrains(tRes.data.results ?? tRes.data)
      setProprietaires(pRes.data.results ?? pRes.data)
    })
  }, [])

  function set(name) {
    return e => setForm(f => ({ ...f, [name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    setErrMsg('')
    setBusy(true)
    try {
      await api.post('/api/litiges/', form)
      setStatus('ok')
      setForm(EMPTY)
      setTimeout(() => { setStatus(null); onSuccess?.() }, 1500)
    } catch (err) {
      const d = err.response?.data
      setErrMsg(
        d && typeof d === 'object'
          ? Object.values(d).flat().join(' ')
          : 'Erreur lors de la déclaration.'
      )
      setStatus('err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {status === 'ok' && (
        <div className="alert alert-success col-2">Litige déclaré avec succès.</div>
      )}
      {status === 'err' && (
        <div className="alert alert-error col-2">{errMsg}</div>
      )}

      <div className="form-group">
        <label className="form-label">Terrain</label>
        <select className="form-control" value={form.terrain} onChange={set('terrain')} required>
          <option value="">— Choisir —</option>
          {terrains.map(t => (
            <option key={t.id} value={t.id}>{t.adresse}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Déclarant</label>
        <select className="form-control" value={form.declarant} onChange={set('declarant')} required>
          <option value="">— Choisir —</option>
          {proprietaires.map(p => (
            <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
          ))}
        </select>
      </div>

      <div className="form-group col-2">
        <label className="form-label">Description</label>
        <textarea rows={3} className="form-control"
          value={form.description} onChange={set('description')} required />
      </div>

      <div className="form-actions col-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Déclaration…' : 'Déclarer le litige'}
        </button>
      </div>
    </form>
  )
}
