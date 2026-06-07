import { useEffect, useState } from 'react'
import api from '../api/client'
import TransactionForm from '../components/TransactionForm'
import { shortHash } from '../utils'

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

export default function Transactions() {
  const [items,    setItems]    = useState([])
  const [blocByTx, setBlocByTx] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)

  async function load() {
    setLoadErr(false)
    try {
      const [txRes, bcRes] = await Promise.all([
        api.get('/api/transactions/'),
        api.get('/api/blockchain/'),
      ])
      setItems(txRes.data.results ?? txRes.data)
      const lookup = {}
      for (const b of (bcRes.data.results ?? bcRes.data)) {
        if (b.data?.transaction_id != null) lookup[b.data.transaction_id] = b
      }
      setBlocByTx(lookup)
    } catch {
      setLoadErr(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleExpand(id) {
    setExpanded(prev => (prev === id ? null : id))
  }

  const nomProp = (detail, id) =>
    detail ? `${detail.prenom} ${detail.nom}` : `#${id}`

  return (
    <div className="page">
      <div className="page-header">
        <h2>Transactions</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Annuler' : '+ Nouvelle transaction'}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Nouvelle transaction</h3>
          <TransactionForm onSuccess={() => { load(); setShowForm(false) }} />
        </div>
      )}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : loadErr ? (
        <p className="text-muted">Impossible de charger les transactions.</p>
      ) : items.length === 0 ? (
        <p className="text-muted">Aucune transaction enregistrée.</p>
      ) : (
        <div className="card-list">
          {items.map(tx => {
            const bloc   = blocByTx[tx.id]
            const isOpen = expanded === tx.id
            return (
              <div key={tx.id} className="card tx-card">
                <div className="card-header">
                  <span className="card-title">
                    {tx.terrain_detail?.adresse ?? `Terrain #${tx.terrain}`}
                  </span>
                  <span className="text-muted" style={{ fontSize: '.82rem' }}>
                    {new Date(tx.date_transaction).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <div className="tx-parties">
                  <span className="tx-vendeur">{nomProp(tx.vendeur_detail, tx.vendeur)}</span>
                  <span className="tx-arrow">vers</span>
                  <span className="tx-acheteur">{nomProp(tx.acheteur_detail, tx.acheteur)}</span>
                  <span className="tx-montant">
                    {parseFloat(tx.montant).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="card-footer">
                  <span className="tx-sig-preview" title={tx.signature_numerique}>
                    Sig&nbsp;: <code>{shortHash(tx.signature_numerique)}</code>
                  </span>
                  {bloc != null && (
                    <span className="badge badge-bloc">Bloc #{bloc.index}</span>
                  )}
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => toggleExpand(tx.id)}
                  >
                    {isOpen ? 'Masquer' : 'Détails'}
                  </button>
                </div>

                {isOpen && (
                  <div className="tx-details">
                    <div className="tx-detail-section">
                      <h4>Signature numérique</h4>
                      <div className="sig-row">
                        <code className="sig-value">{tx.signature_numerique}</code>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => copyText(tx.signature_numerique)}
                        >
                          Copier
                        </button>
                      </div>
                    </div>

                    {bloc != null ? (
                      <div className="tx-detail-section">
                        <h4>Bloc blockchain #{bloc.index}</h4>
                        <div className="bloc-hashes" style={{ marginBottom: '.5rem' }}>
                          <div className="hash-line">
                            <span className="hash-label">Timestamp</span>
                            <code className="hash-value">
                              {new Date(bloc.timestamp).toLocaleString('fr-FR')}
                            </code>
                          </div>
                          <div className="hash-line">
                            <span className="hash-label">Hash</span>
                            <code className="hash-value" title={bloc.hash}>{bloc.hash}</code>
                          </div>
                          <div className="hash-line">
                            <span className="hash-label">Précédent</span>
                            <code className="hash-value" title={bloc.previous_hash}>
                              {bloc.previous_hash}
                            </code>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted" style={{ fontSize: '.82rem' }}>
                        Aucun bloc blockchain associé à cette transaction.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
