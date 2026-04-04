import { useState, useEffect, useCallback } from 'react'
import {
  AppShell,
  Button,
  Container,
  Group,
  Tabs,
  Title,
  Text,
} from '@mantine/core'
import { IconServer, IconChartBar } from '@tabler/icons-react'
import ServicesView from './components/ServicesView'
import MetricsDashboard from './components/MetricsDashboard'
import { fetchServices } from './api'
import type { Service } from './types'

export default function App() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('services')

  const loadServices = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchServices()
      setServices(data)
    } catch {
      setError('Could not load services. Is the BFF service running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="xs">
              <Title order={3} c="orange">429.rs</Title>
              <Text size="sm" c="dimmed">Rate Limit Dashboard</Text>
            </Group>
            <Button
              variant="subtle"
              size="xs"
              c="dimmed"
              onClick={activeTab === 'services' ? loadServices : undefined}
            >
              {activeTab === 'services' ? 'Refresh' : ''}
            </Button>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" pt="lg">
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'services')}>
            <Tabs.List mb="lg">
              <Tabs.Tab value="services" leftSection={<IconServer size={16} />}>
                Services
              </Tabs.Tab>
              <Tabs.Tab value="metrics" leftSection={<IconChartBar size={16} />}>
                Metrics
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="services">
              <ServicesView
                services={services}
                loading={loading}
                error={error}
                onRefresh={loadServices}
              />
            </Tabs.Panel>

            <Tabs.Panel value="metrics">
              <MetricsDashboard />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
