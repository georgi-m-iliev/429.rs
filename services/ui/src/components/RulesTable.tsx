import type { RateLimitRule } from '../App'

type Props = {
  rules: RateLimitRule[]
  onEdit: (rule: RateLimitRule) => void
  onDelete: (id: string) => void
}

export default function RulesTable({ rules, onEdit, onDelete }: Props) {
  if (rules.length === 0) {
    return (
      <div className="empty-state">
        <p>No rate-limit rules configured.</p>
        <p>Click <strong>+ New Rule</strong> to add one.</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="rules-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Path</th>
            <th>Limit</th>
            <th>Window</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td><code>{rule.id}</code></td>
              <td><code>{rule.path}</code></td>
              <td>{rule.limit} req</td>
              <td>{rule.window_seconds}s</td>
              <td>
                <span className={`badge ${rule.enabled ? 'badge-green' : 'badge-gray'}`}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </td>
              <td className="actions">
                <button className="btn btn-secondary" onClick={() => onEdit(rule)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => onDelete(rule.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .empty-state {
          text-align: center;
          color: #94a3b8;
          padding: 3rem;
        }
        .empty-state p { margin-bottom: 0.5rem; }
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
        .badge {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .badge-green { background: #14532d; color: #86efac; }
        .badge-gray  { background: #1e293b; color: #94a3b8; }
        .actions { display: flex; gap: 0.5rem; }
        code { font-family: monospace; color: #7dd3fc; }
      `}</style>
    </div>
  )
}
