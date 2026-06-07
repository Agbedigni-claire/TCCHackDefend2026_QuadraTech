import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { toRelativeUrl, STATUT_LABELS } from '../utils'

const EMPTY = { nom: '', prenom: '', email: '', telephone: '', numero_identite: '' }

export default function Proprietaires() {
  const [items,          setItems]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [form,           setForm]           = useState(EMPTY)
  const [formErr,        setFormErr]        = useState(null)
  const [openProp,       setOpenProp]       = useState(null)
  const [propTerrains,   setPropTerrains]   = useState({})
  const [loadingTerrain, setLoadingTerrain] = useState({})
  const [qrModal,        setQrModal]        = useState(null)

  async function load() {
    const { data } = await api.get('/api/proprietaires/')
    setItems(data.results ?? data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function set(name) {
    return e => setForm(f => ({ ...f, [name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr(null)
    try {
      await api.post('/api/proprietaires/', form)
      setShowForm(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      const d = err.response?.data
      setFormErr(d ? Object.values(d).flat().join(' ') : 'Erreur.')
    }
  }

  async function loadTerrains(propId) {
    if (propTerrains[propId] !== undefined) return
    setLoadingTerrain(prev => ({ ...prev, [propId]: true }))
    try {
      const { data } = await api.get(`/api/terrains/?proprietaire=${propId}`)
      setPropTerrains(prev => ({ ...prev, [propId]: data.results ?? data }))
    } finally {
      setLoadingTerrain(prev => ({ ...prev, [propId]: false }))
    }
  }

  function toggleProp(propId) {
    setOpenProp(prev => {
      if (prev === propId) return null
      loadTerrains(propId)
      return propId
    })
  }

  return (
    <div className="page">

      {qrModal && (
        <div className="qr-overlay" onClick={() => setQrModal(null)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <img src={toRelativeUrl(qrModal)} alt="QR Code terrain" />
            <p className="text-muted" style={{ marginTop: '0.75rem' }}>
              Cliquer en dehors pour fermer
            </p>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2>Propriétaires</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Annuler' : '+ Nouveau propriétaire'}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Nouveau propriétaire</h3>
          {formErr && <div className="alert alert-error">{formErr}</div>}
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input className="form-control" value={form.prenom} onChange={set('prenom')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nom</label>
              <input className="form-control" value={form.nom} onChange={set('nom')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="form-control" value={form.telephone} onChange={set('telephone')} required />
            </div>
            <div className="form-group col-2">
              <label className="form-label">Numéro d'identité</label>
              <input className="form-control" value={form.numero_identite} onChange={set('numero_identite')} required />
            </div>
            <div className="form-actions col-2">
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Prénom Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>N° Identité</th>
              <th>Enregistré le</th>
              <th>Terrains</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <React.Fragment key={p.id}>
                <tr>
                  <td>{p.prenom} {p.nom}</td>
                  <td>{p.email}</td>
                  <td>{p.telephone}</td>
                  <td><code>{p.numero_identite}</code></td>
                  <td>{new Date(p.date_enregistrement).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => toggleProp(p.id)}
                    >
                      {openProp === p.id ? 'Masquer' : 'Parcelles'}
                    </button>
                  </td>
                </tr>
                {openProp === p.id && (
                  <tr>
                    <td colSpan={6} className="prop-terrains-cell">
                      {loadingTerrain[p.id] ? (
                        <p className="text-muted">Chargement…</p>
                      ) : !propTerrains[p.id] || propTerrains[p.id].length === 0 ? (
                        <p className="text-muted">Aucun terrain pour ce propriétaire.</p>
                      ) : (
                        <div className="prop-terrain-list">
                          {propTerrains[p.id].map(t => (
                            <div key={t.id} className="prop-terrain-item">
                              {t.qr_code ? (
                                <img
                                  src={toRelativeUrl(t.qr_code)}
                                  alt="QR"
                                  className="qr-thumb-xs"
                                  title="Cliquer pour agrandir"
                                  onClick={() => setQrModal(t.qr_code)}
                                />
                              ) : (
                                <div className="qr-thumb-placeholder" />
                              )}
                              <div className="prop-terrain-info">
                                <strong>{t.adresse}</strong>
                                <span className={`badge badge-${t.statut}`}>
                                  {STATUT_LABELS[t.statut]}
                                </span>
                                <span className="text-muted">
                                  {parseFloat(t.superficie).toLocaleString('fr-FR')} m²
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-muted">Aucun propriétaire.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
