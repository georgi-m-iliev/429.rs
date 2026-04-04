import type { Rule, RuleCreate, RuleUpdate, Service, ServiceCreate } from './types'

const API_BASE = '/api'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json()
}

// Services
export async function fetchServices(): Promise<Service[]> {
  return handleResponse(await fetch(`${API_BASE}/config/services`))
}

export async function createService(data: ServiceCreate): Promise<Service> {
  return handleResponse(
    await fetch(`${API_BASE}/config/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  )
}

export async function deleteService(id: string): Promise<void> {
  return handleResponse(
    await fetch(`${API_BASE}/config/services/${id}`, { method: 'DELETE' }),
  )
}

// Rules
export async function fetchRules(serviceId?: string): Promise<Rule[]> {
  const url = serviceId
    ? `${API_BASE}/config/rules?service_id=${serviceId}`
    : `${API_BASE}/config/rules`
  return handleResponse(await fetch(url))
}

export async function createRule(data: RuleCreate): Promise<Rule> {
  return handleResponse(
    await fetch(`${API_BASE}/config/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  )
}

export async function updateRule(id: string, data: RuleUpdate): Promise<Rule> {
  return handleResponse(
    await fetch(`${API_BASE}/config/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  )
}

export async function deleteRule(id: string): Promise<void> {
  return handleResponse(
    await fetch(`${API_BASE}/config/rules/${id}`, { method: 'DELETE' }),
  )
}
