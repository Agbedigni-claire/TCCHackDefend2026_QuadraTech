import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

const TYPE_LABELS = {
  transaction_repetee: 'Transaction répétée',
  vendeur_suspect:     'Vendeur suspect',
  double_transaction:  'Double transaction',
}

const NIVEAU_CONFIG = {
  critique: {
    border:  'border-l-red-500',
    bg:      'bg-red-50',
    badge:   'bg-red-100 text-red-700',
    dot:     'bg-red-500',
    label:   'Critique',
  },
  moyen: {
    border:  'border-l-amber-500',
    bg:      'bg-amber-50',
    badge:   'bg-amber-100 text-amber-700',
    dot:     'bg-amber-500',
    label:   'Moyen',
  },
  faible: {
    border:  'border-l-blue-400',
    bg:      'bg-blue-50',
    badge:   'bg-blue-100 text-blue-700',
    dot:     'bg-blue-400',
    label:   'Faible',
  },
}

const FILTRES = ['tout', 'critique', 'moyen', 'faible']

export default function Alertes() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre,  setFiltre]  = useState('tout')

  useEffect(() => {
    api.get('/api/alertes/').then(({ data }) => {
      setItems(data.results ?? data)
      setLoading(false)
    })
  }, [])

  const visible = filtre === 'tout' ? items : items.filter(a => a.niveau === filtre)

  const counts = items.reduce((acc, a) => {
    acc[a.niveau] = (acc[a.niveau] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Alertes de fraude</h2>
          {!loading && (
            <p className="text-muted" style={{ marginTop: '.25rem' }}>
              {items.length} alerte{items.length !== 1 ? 's' : ''} au total
            </p>
          )}
        </div>

        {/* Compteurs par niveau */}
        {!loading && items.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {(['critique', 'moyen', 'faible']).map(n => (
              counts[n] ? (
                <span
                  key={n}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${NIVEAU_CONFIG[n].badge}`}
                >
                  <span className={`w-2 h-2 rounded-full ${NIVEAU_CONFIG[n].dot}`} />
                  {counts[n]} {NIVEAU_CONFIG[n].label.toLowerCase()}
                </span>
              ) : null
            ))}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap mb-5">
        {FILTRES.map(f => (
          <button
            key={f}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filtre === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
            }`}
            onClick={() => setFiltre(f)}
          >
            {f === 'tout' ? 'Toutes' : NIVEAU_CONFIG[f].label}
            {f !== 'tout' && counts[f] ? ` (${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="alert-empty-icon" />
          <p className="text-gray-600 font-medium" style={{ marginTop: '1rem' }}>
            {filtre === 'tout'
              ? 'Aucune alerte détectée.'
              : `Aucune alerte de niveau « ${NIVEAU_CONFIG[filtre].label} ».`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(a => {
            const cfg = NIVEAU_CONFIG[a.niveau]
            return (
              <div
                key={a.id}
                className={`${cfg.bg} border border-l-4 ${cfg.border} rounded-xl p-5 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {TYPE_LABELS[a.type_alerte] ?? a.type_alerte}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(a.date).toLocaleString('fr-FR')}
                  </span>
                </div>

                <p className="mt-2.5 text-sm text-gray-700 leading-relaxed">
                  {a.description}
                </p>

                {a.terrain_detail && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-400">Terrain :</span>
                    <Link
                      to={`/terrains/${a.terrain_detail.id}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {a.terrain_detail.adresse}
                    </Link>
                    <span className={`badge badge-${a.terrain_detail.statut}`} style={{ fontSize: '.65rem' }}>
                      {a.terrain_detail.statut}
                    </span>
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
