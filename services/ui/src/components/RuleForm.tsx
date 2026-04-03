import { useState } from 'react'
import type { RateLimitRule } from '../App'

type Props = {
  rule: RateLimitRule
  isNew: boolean
  onSave: (rule: RateLimitRule, isNew: boolean) => void
  onCancel: () => void
}

export default function RuleForm({ rule, isNew, onSave, onCancel }: Props) {
  const [form, setForm] = useState<RateLimitRule>({ ...rule })

  const set = (field: keyof RateLimitRule, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form, isNew)
      }}
    >
      <div className="form-group">
        <label>Rule ID</label>
        <input
          value={form.id}
          onChange={(e) => set('id', e.target.value)}
          placeholder="e.g. products-default"
          disabled={!isNew}
          required
        />
      </div>

      <div className="form-group">
        <label>Path Pattern</label>
        <input
          value={form.path}
          onChange={(e) => set('path', e.target.value)}
          placeholder="e.g. /products/*"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Limit (requests)</label>
          <input
            type="number"
            min={1}
            value={form.limit}
            onChange={(e) => set('limit', parseInt(e.target.value))}
            required
          />
        </div>

        <div className="form-group">
          <label>Window (seconds)</label>
          <input
            type="number"
            min={1}
            value={form.window_seconds}
            onChange={(e) => set('window_seconds', parseInt(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="form-group form-group-inline">
        <label>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isNew ? 'Create' : 'Save'}
        </button>
      </div>

      <style>{`
        .form-group { margin-bottom: 1rem; }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 0.35rem;
        }
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group input:not([type="checkbox"]) {
          width: 100%;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          color: #e2e8f0;
          font-size: 0.9rem;
        }
        .form-group input:disabled { opacity: 0.5; cursor: not-allowed; }
        .form-row { display: flex; gap: 1rem; }
        .form-row .form-group { flex: 1; }
        .form-group-inline label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
      `}</style>
    </form>
  )
}
