import { useEffect, useState } from 'react'
import api from '../api/client'

function HashLine({ label, value }) {
  return (
    <div className="hash-line">
      <span className="hash-label">{label}</span>
      <code className="hash-value" title={value}>{value}</code>
    </div>
  )
}

export default function Blockchain() {
  const [blocs,     setBlocs]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [validity,  setValidity]  = useState(null)   // null | true | false
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    api.get('/api/blockchain/').then(({ data }) => {
      setBlocs(data)
      setLoading(false)
    })
  }, [])

  async function handleVerify() {
    setVerifying(true)
    try {
      const { data } = await api.get('/api/blockchain/verifier/')
      setValidity(data.valide)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Blockchain</h2>
          {!loading && (
            <p className="text-muted" style={{ marginTop: '.25rem' }}>
              {blocs.length} bloc{blocs.length !== 1 ? 's' : ''} enregistré{blocs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="chain-status">
          {validity !== null && (
            <span className={`chain-badge ${validity ? 'chain-valid' : 'chain-invalid'}`}>
              {validity ? 'Intégrité vérifiée' : 'Intégrité compromise'}
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={handleVerify}
            disabled={verifying || loading}
          >
            {verifying ? 'Vérification…' : 'Vérifier l\'intégrité'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : blocs.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-muted">
            Aucun bloc. La chaîne s'initialise automatiquement à la première transaction.
          </p>
        </div>
      ) : (
        <div className="bloc-chain">
          {blocs.map((bloc, i) => (
            <div key={bloc.id}>
              <div className="card bloc-card">
                <div className="bloc-header">
                  <div className="bloc-index-wrap">
                    <span className="bloc-index">
                      {bloc.index === 0 ? 'Bloc Genesis' : `Bloc #${bloc.index}`}
                    </span>
                    <span className="bloc-type">
                      {bloc.data?.type ?? '—'}
                    </span>
                  </div>
                  <span className="bloc-ts">
                    {new Date(bloc.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>

                <div className="bloc-hashes">
                  <HashLine label="Hash"     value={bloc.hash} />
                  <HashLine label="Précédent" value={bloc.previous_hash} />
                </div>

                <details className="bloc-data">
                  <summary>Données du bloc</summary>
                  <pre>{JSON.stringify(bloc.data, null, 2)}</pre>
                </details>
              </div>

              {i < blocs.length - 1 && (
                <div className="chain-connector" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
