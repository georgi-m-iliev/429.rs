import { useState } from 'react'
import {
  Accordion,
  Badge,
  Button,
  Group,
  Modal,
  Table,
  Text,
  ActionIcon,
  Tooltip,
  Stack,
  Alert,
  Skeleton,
} from '@mantine/core'
import { IconPlus, IconTrash, IconEdit, IconAlertCircle } from '@tabler/icons-react'
import type { Rule, RuleCreate, RuleUpdate, Service, ServiceCreate } from '../types'
import ServiceForm from './ServiceForm'
import RuleForm from './RuleForm'
import { createService, deleteRule, deleteService, createRule, updateRule } from '../api'

type Props = {
  services: Service[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export default function ServicesView({ services, loading, error, onRefresh }: Props) {
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [ruleModalService, setRuleModalService] = useState<Service | null>(null)
  const [editingRule, setEditingRule] = useState<{ rule: Rule; service: Service } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleCreateService = async (data: ServiceCreate) => {
    setActionError(null)
    try {
      await createService(data)
      setServiceModalOpen(false)
      onRefresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to create service')
    }
  }

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Delete service "${service.url}"? This will also delete all its rules.`)) return
    setActionError(null)
    try {
      await deleteService(service.id)
      onRefresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete service')
    }
  }

  const handleSaveRule = async (data: RuleCreate | RuleUpdate, isNew: boolean) => {
    setActionError(null)
    try {
      if (isNew) {
        await createRule(data as RuleCreate)
      } else if (editingRule) {
        await updateRule(editingRule.rule.id, data as RuleUpdate)
      }
      setRuleModalService(null)
      setEditingRule(null)
      onRefresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to save rule')
    }
  }

  const handleDeleteRule = async (rule: Rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return
    setActionError(null)
    try {
      await deleteRule(rule.id)
      onRefresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete rule')
    }
  }

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Text fw={600} size="lg">Services</Text>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setServiceModalOpen(true)}
        >
          New Service
        </Button>
      </Group>

      {(error || actionError) && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error ?? actionError}
        </Alert>
      )}

      {loading ? (
        <Stack gap="sm">
          {[1, 2, 3].map((i) => <Skeleton key={i} height={60} radius="md" />)}
        </Stack>
      ) : services.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No services configured. Click <strong>New Service</strong> to add one.
        </Text>
      ) : (
        <Accordion variant="separated" multiple>
          {services.map((service) => (
            <Accordion.Item key={service.id} value={service.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Group gap="xs">
                      <Text fw={500} size="sm" ff="monospace">{service.url}</Text>
                      <Badge color={service.enabled ? 'green' : 'gray'} size="xs">
                        {service.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Tenant: {service.tenant_id}
                      {service.description ? ` · ${service.description}` : ''}
                    </Text>
                  </div>
                  <Badge size="sm" variant="light">
                    {service.rules.length} rule{service.rules.length !== 1 ? 's' : ''}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Group justify="space-between" mb="sm">
                  <Text size="sm" c="dimmed">Rules</Text>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={12} />}
                      onClick={() => setRuleModalService(service)}
                    >
                      Add Rule
                    </Button>
                    <Tooltip label="Delete service">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleDeleteService(service)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                {service.rules.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="sm">
                    No rules yet. Click <strong>Add Rule</strong> to create one.
                  </Text>
                ) : (
                  <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Path Pattern</Table.Th>
                        <Table.Th>Limit</Table.Th>
                        <Table.Th>Priority</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {service.rules.map((rule) => (
                        <Table.Tr key={rule.id}>
                          <Table.Td>
                            <Text size="sm" fw={500}>{rule.name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" ff="monospace">{rule.path_pattern}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {rule.limit.requests} req / {rule.limit.window_seconds}s
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{rule.priority}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={rule.enabled ? 'green' : 'gray'} size="sm">
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Edit rule">
                                <ActionIcon
                                  variant="subtle"
                                  onClick={() => setEditingRule({ rule, service })}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Delete rule">
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => handleDeleteRule(rule)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      {/* Create Service modal */}
      <Modal
        opened={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title="New Service"
        size="md"
      >
        <ServiceForm
          onSave={handleCreateService}
          onCancel={() => setServiceModalOpen(false)}
        />
      </Modal>

      {/* Create Rule modal */}
      <Modal
        opened={!!ruleModalService}
        onClose={() => setRuleModalService(null)}
        title={`Add Rule — ${ruleModalService?.url ?? ''}`}
        size="lg"
      >
        {ruleModalService && (
          <RuleForm
            serviceId={ruleModalService.id}
            onSave={handleSaveRule}
            onCancel={() => setRuleModalService(null)}
          />
        )}
      </Modal>

      {/* Edit Rule modal */}
      <Modal
        opened={!!editingRule}
        onClose={() => setEditingRule(null)}
        title={`Edit Rule — ${editingRule?.rule.name ?? ''}`}
        size="lg"
      >
        {editingRule && (
          <RuleForm
            serviceId={editingRule.service.id}
            rule={editingRule.rule}
            onSave={handleSaveRule}
            onCancel={() => setEditingRule(null)}
          />
        )}
      </Modal>
    </>
  )
}
