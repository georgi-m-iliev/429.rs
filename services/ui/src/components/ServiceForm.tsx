import { useState } from 'react'
import { TextInput, Textarea, Switch, Button, Group, Stack, Text } from '@mantine/core'
import type { Service, ServiceCreate, ServiceUpdate } from '../types'

type CreateProps = {
  onSave: (data: ServiceCreate) => Promise<void>
  onCancel: () => void
  service?: undefined
}

type EditProps = {
  service: Service
  onSave: (data: ServiceUpdate) => Promise<void>
  onCancel: () => void
}

type Props = CreateProps | EditProps

export default function ServiceForm({ service, onSave, onCancel }: Props) {
  const isEdit = !!service

  const [url, setUrl] = useState(service?.url ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [tenantId, setTenantId] = useState(service?.tenant_id ?? '')
  const [enabled, setEnabled] = useState(service?.enabled ?? true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (isEdit) {
        await (onSave as EditProps['onSave'])({ url, description: description || null, enabled })
      } else {
        await (onSave as CreateProps['onSave'])({
          tenant_id: tenantId,
          url,
          description: description || null,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        {isEdit ? (
          <Text size="sm" c="dimmed">
            Tenant: <strong>{service.tenant_id}</strong>
          </Text>
        ) : (
          <TextInput
            label="Tenant ID"
            placeholder="e.g. my-org"
            value={tenantId}
            onChange={(e) => setTenantId(e.currentTarget.value)}
            required
          />
        )}
        <TextInput
          label="Service URL"
          placeholder="e.g. http://api.example.com"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          required
        />
        <Textarea
          label="Description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={2}
        />
        {isEdit && (
          <Switch
            label="Enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save Changes' : 'Create Service'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
