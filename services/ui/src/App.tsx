import { useState, useEffect } from 'react'
import RulesTable from './components/RulesTable'
import RuleForm from './components/RuleForm'
import MetricsDashboard from './components/MetricsDashboard'
import './App.css'

export type RateLimitRule = {
  id: string
  path: string
  limit: number
  window_seconds: number
  enabled: boolean
}

const API_BASE = '/api'

async function fetchRules(): Promise<RateLimitRule[]> {
  const res = await fetch(`${API_BASE}/config/rules`)
  if (!res.ok) throw new Error('Failed to fetch rules')
  return res.json()
}

async function deleteRule(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/config/rules/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete rule')
}

async function saveRule(rule: RateLimitRule, isNew: boolean): Promise<RateLimitRule> {
  const res = await fetch(
    `${API_BASE}/config/rules${isNew ? '' : `/${rule.id}`}`,
    {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    },
  )
  if (!res.ok) throw new Error('Failed to save rule')
  return res.json()
}

type Tab = 'rules' | 'metrics'

export default function App() {
  const [rules, setRules] = useState<RateLimitRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('rules')

  const loadRules = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchRules()
      setRules(data)
    } catch {
      setError('Could not load rules. Is the BFF service running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete rule "${id}"?`)) return
    try {
      await deleteRule(id)
      await loadRules()
    } catch {
      setError('Failed to delete rule')
    }
  }

  const handleSave = async (rule: RateLimitRule, isNew: boolean) => {
    try {
      await saveRule(rule, isNew)
      setEditingRule(null)
      setIsCreating(false)
      await loadRules()
    } catch {
      setError('Failed to save rule')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>
            <span className="brand">429.rs</span>
            <span className="subtitle">Rate Limit Dashboard</span>
          </h1>
          <nav className="tabs">
            <button
              className={activeTab === 'rules' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('rules')}
            >
              Rules
            </button>
            <button
              className={activeTab === 'metrics' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('metrics')}
            >
              Metrics
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {error && <div className="error-banner">{error}</div>}

        {activeTab === 'rules' && (
          <>
            <div className="section-header">
              <h2>Rate Limit Rules</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setIsCreating(true)
                  setEditingRule({
                    id: '',
                    path: '/*',
                    limit: 100,
                    window_seconds: 60,
                    enabled: true,
                  })
                }}
              >
                + New Rule
              </button>
            </div>

            {loading ? (
              <p className="loading">Loading rules…</p>
            ) : (
              <RulesTable
                rules={rules}
                onEdit={(rule) => {
                  setIsCreating(false)
                  setEditingRule(rule)
                }}
                onDelete={handleDelete}
              />
            )}

            {editingRule && (
              <div className="modal-overlay" onClick={() => setEditingRule(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <h3>{isCreating ? 'Create Rule' : 'Edit Rule'}</h3>
                  <RuleForm
                    rule={editingRule}
                    isNew={isCreating}
                    onSave={handleSave}
                    onCancel={() => {
                      setEditingRule(null)
                      setIsCreating(false)
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'metrics' && <MetricsDashboard />}
      </main>
    </div>
  )
}
