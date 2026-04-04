import { useState } from 'react'
import {
  TextInput,
  NumberInput,
  Switch,
  Button,
  Group,
  Stack,
  Divider,
  ActionIcon,
  Paper,
  Title,
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import type { HeaderOverride, LimitSchema, Rule, RuleCreate, RuleUpdate } from '../types'

type Props = {
  serviceId: string
  rule?: Rule
  onSave: (data: RuleCreate | RuleUpdate, isNew: boolean) => Promise<void>
  onCancel: () => void
}

function emptyLimit(): LimitSchema {
  return { enabled: true, requests: 100, window_seconds: 60 }
}

function emptyOverride(): HeaderOverride {
  return { header_name: '', header_value: '', limit: emptyLimit() }
}

export default function RuleForm({ serviceId, rule, onSave, onCancel }: Props) {
  const isNew = !rule

  const [name, setName] = useState(rule?.name ?? '')
  const [pathPattern, setPathPattern] = useState(rule?.path_pattern ?? '/*')
  const [limit, setLimit] = useState<LimitSchema>(rule?.limit ?? emptyLimit())
  const [priority, setPriority] = useState<number>(rule?.priority ?? 100)
  const [overrides, setOverrides] = useState<HeaderOverride[]>(rule?.header_overrides ?? [])
  const [submitting, setSubmitting] = useState(false)

  const setLimitField = <K extends keyof LimitSchema>(key: K, value: LimitSchema[K]) =>
    setLimit((prev) => ({ ...prev, [key]: value }))

  const addOverride = () => setOverrides((prev) => [...prev, emptyOverride()])
  const removeOverride = (i: number) => setOverrides((prev) => prev.filter((_, idx) => idx !== i))
  const updateOverride = (i: number, patch: Partial<HeaderOverride>) =>
    setOverrides((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))
  const updateOverrideLimit = (i: number, patch: Partial<LimitSchema>) =>
    setOverrides((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, limit: { ...o.limit, ...patch } } : o)),
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = {
        service_id: serviceId,
        name,
        path_pattern: pathPattern,
        limit,
        priority,
        header_overrides: overrides,
      }
      await onSave(data, isNew)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Rule Name"
          placeholder="e.g. default-limit"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Path Pattern"
          placeholder="e.g. /api/*"
          value={pathPattern}
          onChange={(e) => setPathPattern(e.currentTarget.value)}
          required
        />
        <NumberInput
          label="Priority"
          description="Lower numbers have higher priority"
          value={priority}
          onChange={(v) => setPriority(Number(v))}
          min={0}
        />

        <Divider label="Rate Limit" labelPosition="left" />
        <Switch
          label="Limit enabled"
          checked={limit.enabled}
          onChange={(e) => setLimitField('enabled', e.currentTarget.checked)}
        />
        <Group grow>
          <NumberInput
            label="Max requests"
            value={limit.requests}
            onChange={(v) => setLimitField('requests', Number(v))}
            min={1}
            required
          />
          <NumberInput
            label="Window (seconds)"
            value={limit.window_seconds}
            onChange={(v) => setLimitField('window_seconds', Number(v))}
            min={1}
            required
          />
        </Group>

        <Divider label="Header Overrides" labelPosition="left" />
        {overrides.map((o, i) => (
          <Paper key={i} p="sm" withBorder>
            <Group justify="space-between" mb="xs">
              <Title order={6} c="dimmed">Override {i + 1}</Title>
              <ActionIcon color="red" variant="subtle" onClick={() => removeOverride(i)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
            <Stack gap="sm">
              <Group grow>
                <TextInput
                  label="Header name"
                  value={o.header_name}
                  onChange={(e) => updateOverride(i, { header_name: e.currentTarget.value })}
                  required
                />
                <TextInput
                  label="Header value"
                  value={o.header_value}
                  onChange={(e) => updateOverride(i, { header_value: e.currentTarget.value })}
                  required
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Requests"
                  value={o.limit.requests}
                  onChange={(v) => updateOverrideLimit(i, { requests: Number(v) })}
                  min={1}
                  required
                />
                <NumberInput
                  label="Window (s)"
                  value={o.limit.window_seconds}
                  onChange={(v) => updateOverrideLimit(i, { window_seconds: Number(v) })}
                  min={1}
                  required
                />
              </Group>
            </Stack>
          </Paper>
        ))}
        <Button
          variant="subtle"
          leftSection={<IconPlus size={16} />}
          onClick={addOverride}
          size="sm"
        >
          Add header override
        </Button>

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isNew ? 'Create Rule' : 'Save Changes'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
