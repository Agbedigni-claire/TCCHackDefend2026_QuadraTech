import { useEffect, useState } from 'react'
import api from '../api/client'

const EMPTY = {
  superficie: '', coordonnees_gps: '', adresse: '',
  statut: 'libre', proprietaire_actuel: '',
}

/**
 * Formulaire standalone de création de terrain.
 * Props :
 *   onSuccess — callback appelé ~1,5 s après une soumission réussie
 */
export default function TerrainForm({ onSuccess }) {
  const [form,          setForm]          = useState(EMPTY)
  const [proprietaires, setProprietaires] = useState([])
  const [status,        setStatus]        = useState(null) // null | 'ok' | 'err'
  const [errMsg,        setErrMsg]        = useState('')
  const [busy,          setBusy]          = useState(false)

  useEffect(() => {
    api.get('/api/proprietaires/').then(({ data }) =>
      setProprietaires(data.results ?? data)
    )
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
      await api.post('/api/terrains/', form)
      setStatus('ok')
      setForm(EMPTY)
      setTimeout(() => { setStatus(null); onSuccess?.() }, 1500)
    } catch (err) {
      const d = err.response?.data
      setErrMsg(
        d && typeof d === 'object'
          ? Object.values(d).flat().join(' ')
          : 'Erreur lors de la création.'
      )
      setStatus('err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {status === 'ok' && (
        <div className="alert alert-success col-2">Terrain créé avec succès.</div>
      )}
      {status === 'err' && (
        <div className="alert alert-error col-2">{errMsg}</div>
      )}

      <div className="form-group">
        <label className="form-label">Superficie (m²)</label>
        <input type="number" step="0.01" className="form-control"
          value={form.superficie} onChange={set('superficie')} required />
      </div>

      <div className="form-group">
        <label className="form-label">Coordonnées GPS</label>
        <input className="form-control" placeholder="lat,lng"
          value={form.coordonnees_gps} onChange={set('coordonnees_gps')} required />
      </div>

      <div className="form-group col-2">
        <label className="form-label">Adresse</label>
        <input className="form-control"
          value={form.adresse} onChange={set('adresse')} required />
      </div>

      <div className="form-group">
        <label className="form-label">Statut initial</label>
        <select className="form-control" value={form.statut} onChange={set('statut')}>
          <option value="libre">Libre</option>
          <option value="litige">En litige</option>
          <option value="en_transaction">En transaction</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Propriétaire actuel</label>
        <select className="form-control"
          value={form.proprietaire_actuel} onChange={set('proprietaire_actuel')} required>
          <option value="">— Choisir —</option>
          {proprietaires.map(p => (
            <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
          ))}
        </select>
      </div>

      <div className="form-actions col-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Créer le terrain'}
        </button>
      </div>
    </form>
  )
}
