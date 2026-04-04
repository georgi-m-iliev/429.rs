import { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  Button,
  Group,
  SimpleGrid,
  Skeleton,
  Table,
  Text,
  Paper,
} from '@mantine/core'
import { IconAlertCircle, IconRefresh, IconTrash } from '@tabler/icons-react'

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

  const load = useCallback(async () => {
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
  }, [])

  const handleReset = async () => {
    if (!confirm('Reset all rate-limit counters?')) return
    await fetch('/api/metrics/reset', { method: 'DELETE' })
    load()
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Text fw={600} size="lg">Live Metrics</Text>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={load}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      {loading && !summary ? (
        <SimpleGrid cols={2} mb="lg">
          <Skeleton height={90} radius="md" />
          <Skeleton height={90} radius="md" />
        </SimpleGrid>
      ) : summary ? (
        <>
          <SimpleGrid cols={2} mb="lg">
            <Paper p="lg" withBorder>
              <Text size="xl" fw={700} c="orange">{summary.total_tracked_clients}</Text>
              <Text size="xs" c="dimmed" mt={4}>Tracked Clients</Text>
            </Paper>
            <Paper p="lg" withBorder>
              <Text size="xl" fw={700} c="orange">
                {summary.entries.reduce((a, e) => a + e.request_count, 0)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>Total Requests</Text>
            </Paper>
          </SimpleGrid>

          {summary.entries.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No active rate-limit windows. Make some requests through the gateway!
            </Text>
          ) : (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Client IP</Table.Th>
                  <Table.Th>Path</Table.Th>
                  <Table.Th>Requests</Table.Th>
                  <Table.Th>TTL (s)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {summary.entries.map((entry, i) => (
                  <Table.Tr key={i}>
                    <Table.Td><Text ff="monospace" size="sm">{entry.client_ip}</Text></Table.Td>
                    <Table.Td><Text ff="monospace" size="sm">{entry.path}</Text></Table.Td>
                    <Table.Td>{entry.request_count}</Table.Td>
                    <Table.Td>{entry.ttl_seconds}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </>
      ) : null}
    </>
  )
}
