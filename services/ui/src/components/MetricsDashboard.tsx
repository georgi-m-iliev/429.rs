import { useState, useEffect } from 'react'

type MetricEntry = {
  client_ip: string
  path: string
  request_count: number
  ttl_seconds: number
}

type MetricsSummary = {
  total_tracked_clients: number
  entries: MetricEntry[]
}

export default function MetricsDashboard() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/metrics/summary')
      if (!res.ok) throw new Error('Failed to fetch metrics')
      setSummary(await res.json())
    } catch {
      setError('Could not load metrics. Is the BFF service running?')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all rate-limit counters?')) return
    await fetch('/api/metrics/reset', { method: 'DELETE' })
    load()
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <div className="section-header">
        <h2>Live Metrics</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={load}>Refresh</button>
          <button className="btn btn-danger" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && <p className="loading">Loading metrics…</p>}

      {!loading && summary && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{summary.total_tracked_clients}</div>
              <div className="stat-label">Tracked Clients</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {summary.entries.reduce((a, e) => a + e.request_count, 0)}
              </div>
              <div className="stat-label">Total Requests</div>
            </div>
          </div>

          {summary.entries.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>
              No active rate-limit windows. Make some requests through the gateway!
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>Client IP</th>
                    <th>Path</th>
                    <th>Requests</th>
                    <th>TTL (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.entries.map((entry, i) => (
                    <tr key={i}>
                      <td><code>{entry.client_ip}</code></td>
                      <td><code>{entry.path}</code></td>
                      <td>{entry.request_count}</td>
                      <td>{entry.ttl_seconds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <style>{`
        .stats-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 1.25rem 1.5rem;
          min-width: 160px;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #f97316;
        }
        .stat-label {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }
        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #334155;
        }
        .rules-table {
          width: 100%;
          border-collapse: collapse;
        }
        .rules-table th, .rules-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #334155;
        }
        .rules-table thead th {
          background: #1e293b;
          color: #94a3b8;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rules-table tbody tr:last-child td { border-bottom: none; }
        .rules-table tbody tr:hover { background: #1e293b; }
        code { font-family: monospace; color: #7dd3fc; }
      `}</style>
    </div>
  )
}
