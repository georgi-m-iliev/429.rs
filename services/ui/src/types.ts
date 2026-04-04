export type LimitSchema = {
  enabled: boolean
  requests: number
  window_seconds: number
}

export type HeaderOverride = {
  header_name: string
  header_value: string
  limit: LimitSchema
}

export type Rule = {
  id: string
  service_id: string
  name: string
  path_pattern: string
  limit: LimitSchema
  priority: number
  header_overrides: HeaderOverride[]
  enabled: boolean
  created_at: string
  updated_at: string
}

export type Service = {
  id: string
  tenant_id: string
  url: string
  description: string | null
  enabled: boolean
  rules: Rule[]
  created_at: string
  updated_at: string
}

export type ServiceCreate = {
  tenant_id: string
  url: string
  description?: string | null
}

export type ServiceUpdate = {
  url?: string
  description?: string | null
  enabled?: boolean
}

export type RuleCreate = {
  service_id: string
  name: string
  path_pattern: string
  limit: LimitSchema
  priority?: number
  header_overrides?: HeaderOverride[]
}

export type RuleUpdate = {
  service_id?: string
  name?: string
  path_pattern?: string
  limit?: LimitSchema
  priority?: number
  header_overrides?: HeaderOverride[]
}
