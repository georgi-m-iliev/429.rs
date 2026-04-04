import { useState } from 'react'
import { TextInput, Textarea, Button, Group, Stack } from '@mantine/core'
import type { ServiceCreate } from '../types'

type Props = {
  onSave: (data: ServiceCreate) => Promise<void>
  onCancel: () => void
}

export default function ServiceForm({ onSave, onCancel }: Props) {
  const [tenantId, setTenantId] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSave({ tenant_id: tenantId, url, description: description || null })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Tenant ID"
          placeholder="e.g. my-org"
          value={tenantId}
          onChange={(e) => setTenantId(e.currentTarget.value)}
          required
        />
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
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create Service
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
