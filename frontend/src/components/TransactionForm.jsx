import { useEffect, useState } from 'react'
import api from '../api/client'

const EMPTY = { terrain: '', vendeur: '', acheteur: '', montant: '' }

/**
 * Formulaire standalone de création de transaction.
 * Props :
 *   onSuccess — callback appelé ~1,5 s après une soumission réussie
 */
export default function TransactionForm({ onSuccess }) {
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
      await api.post('/api/transactions/', form)
      setStatus('ok')
      setForm(EMPTY)
      setTimeout(() => { setStatus(null); onSuccess?.() }, 1500)
    } catch (err) {
      const d = err.response?.data
      setErrMsg(
        Array.isArray(d) ? d.join(' ')
          : d && typeof d === 'object' ? Object.values(d).flat().join(' ')
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
        <div className="alert alert-success col-2">Transaction enregistrée avec succès.</div>
      )}
      {status === 'err' && (
        <div className="alert alert-error col-2">{errMsg}</div>
      )}

      <div className="form-group col-2">
        <label className="form-label">Terrain</label>
        <select className="form-control" value={form.terrain} onChange={set('terrain')} required>
          <option value="">— Choisir un terrain —</option>
          {terrains.map(t => (
            <option key={t.id} value={t.id}>{t.adresse} — {t.statut}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Vendeur</label>
        <select className="form-control" value={form.vendeur} onChange={set('vendeur')} required>
          <option value="">— Choisir —</option>
          {proprietaires.map(p => (
            <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Acheteur</label>
        <select className="form-control" value={form.acheteur} onChange={set('acheteur')} required>
          <option value="">— Choisir —</option>
          {proprietaires.map(p => (
            <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Montant (FCFA)</label>
        <input type="number" step="0.01" min="0" className="form-control"
          value={form.montant} onChange={set('montant')} required />
      </div>

      <div className="form-actions col-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer la transaction'}
        </button>
      </div>
    </form>
  )
}
