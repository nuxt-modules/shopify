import type { Nuxt } from '@nuxt/schema'
import type { JsonRenderSpec } from '@vitejs/devtools/json-render'

import type { ShopifyDevtoolsAnalyticsEvent, ShopifyDevtoolsConsent, ShopifyDevtoolsRequest } from '../runtime/utils/devtools'
import type { ShopifyConfig } from '../types'

import { readFile } from 'node:fs/promises'
import { parse, print } from 'graphql'
import { relative } from 'pathe'
import { titleCase } from 'scule'
import { withQuery } from 'ufo'

import { scanDefinitions } from '../runtime/utils/graphql/scanner'
import { getDocumentFiles } from './codegen'
import { SCHEMA_LANGUAGE_FILE, findFileLiterals } from './graphql/literals'

const HIDDEN = '••••••••'

const SECRET_OPTIONS = new Set(['privateAccessToken', 'headers', 'password', 'accessToken', 'clientSecret', 'refreshToken', 'secret'])

const DEFINITION_KEYWORD = /^\w+/

const REQUEST_SOURCES = { ssr: 'SSR', server: 'Server route', browser: 'Browser' }

const CACHE_STATUSES = { hit: 'Server hit', miss: 'Server miss', bypass: 'Not cached', browser: 'Browser hit' }

const CONSENT_CHOICES = [['analytics', 'Analytics'], ['marketing', 'Marketing'], ['preferences', 'Preferences'], ['saleOfData', 'Sale of data']] as const

const MAX_HEIGHT = 320

const REQUEST_COLUMNS = [
  { key: 'time', label: 'Time' },
  { key: 'api', label: 'API' },
  { key: 'operation', label: 'Operation' },
  { key: 'source', label: 'Source' },
  { key: 'page', label: 'Page' },
  { key: 'status', label: 'Status' },
  { key: 'cache', label: 'Cache' },
  { key: 'duration', label: 'Duration' },
] as const

const ANALYTICS_COLUMNS = [
  { key: 'time', label: 'Time' },
  { key: 'event', label: 'Event' },
  { key: 'page', label: 'Page' },
]

const OPERATION_COLUMNS = [
  { key: 'api', label: 'API' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'file', label: 'File' },
]

const FRAGMENT_COLUMNS = [
  { key: 'api', label: 'API' },
  { key: 'name', label: 'Name' },
  { key: 'file', label: 'File' },
]

type Elements = JsonRenderSpec['elements']

type DevtoolsRequest = ShopifyDevtoolsRequest & { id: number }

type DevtoolsAnalyticsEvent = ShopifyDevtoolsAnalyticsEvent & { id: number }

type Definition = {
  api: string
  name: string
  type: string
  file: string
  path: string
  line: number
}

type ExplorerDock = {
  id: string
  client: string
  title: string
  url: string
}

export type PanelState = {
  requests: DevtoolsRequest[]
  selected?: DevtoolsRequest
  definitions: Definition[]
  analytics: DevtoolsAnalyticsEvent[]
  selectedAnalyticsEvent?: DevtoolsAnalyticsEvent
  consent?: ShopifyDevtoolsConsent
}

function toRow(request: DevtoolsRequest) {
  return {
    id: request.id,
    time: new Date(request.time).toLocaleTimeString(),
    api: titleCase(request.client),
    operation: request.operation,
    source: REQUEST_SOURCES[request.source],
    page: request.page,
    status: request.errors ? 'Error' : 'OK',
    cache: request.cache && CACHE_STATUSES[request.cache],
    duration: request.duration === undefined ? undefined : `${Math.round(request.duration)} ms`,
  }
}

function createRequestDetails(request: DevtoolsRequest, explorerDocks: ExplorerDock[]): Elements {
  const row = toRow(request)
  const explorer = explorerDocks.find(({ client }) => client === request.client)
  const variables = request.variables && JSON.stringify(request.variables, null, 2)

  let query: string

  try {
    query = print(parse(request.query))
  }
  catch {
    query = request.query.trim()
  }

  const sections = [
    { id: 'query', label: 'Query', element: { type: 'CodeBlock', props: { code: query, language: 'graphql', height: MAX_HEIGHT } } },
    ...(variables ? [{ id: 'variables', label: 'Variables', element: { type: 'CodeBlock', props: { code: variables, language: 'json', height: MAX_HEIGHT } } }] : []),
    ...(request.data != null ? [{ id: 'response', label: 'Response', element: { type: 'Tree', props: { data: request.data } } }] : []),
    ...(request.errors ? [{ id: 'errors', label: 'Errors', element: { type: 'Tree', props: { data: request.errors, defaultExpanded: true } } }] : []),
    ...(request.extensions ? [{ id: 'extensions', label: 'Extensions', element: { type: 'Tree', props: { data: request.extensions, defaultExpanded: true } } }] : []),
  ]

  return {
    'request-details': {
      type: 'Card',
      props: { title: `${request.operation} · ${row.api} API` },
      children: ['request-summary', ...(request.deprecation ? ['request-deprecation'] : []), ...(explorer ? ['request-explorer'] : []), 'request-tabs'],
    },
    'request-summary': {
      type: 'KeyValueTable',
      props: {
        data: {
          ...Object.fromEntries(REQUEST_COLUMNS.filter(({ key }) => row[key]).map(({ key, label }) => [label, row[key]])),
          ...(request.processingTime === undefined ? {} : { 'Shopify processing': `${Math.round(request.processingTime)} ms` }),
          ...(request.apiVersion ? { 'API version': request.apiVersion } : {}),
          ...(request.requestId ? { 'Request ID': request.requestId } : {}),
        },
      },
    },
    ...(request.deprecation
      ? {
          'request-deprecation': {
            type: 'Stack',
            props: { direction: 'row', align: 'center', gap: 8, wrap: true },
            children: ['request-deprecation-text', 'request-deprecation-link'],
          },
          'request-deprecation-text': {
            type: 'Text',
            props: { text: 'Shopify flagged this request for using deprecated API features.', color: 'warning' },
          },
          'request-deprecation-link': {
            type: 'Link',
            props: { href: request.deprecation, label: 'Learn more', icon: 'ph:arrow-square-out', external: true },
          },
        }
      : {}),
    ...(explorer
      ? {
          'request-explorer': {
            type: 'Link',
            props: { href: withQuery(explorer.url, { query, variables }), label: 'Open in explorer', icon: 'ph:arrow-square-out', external: true },
          },
        }
      : {}),
    'request-tabs': {
      type: 'Tabs',
      props: { tabs: sections.map(({ id, label }) => ({ value: id, label })) },
      children: sections.map(({ id }) => `request-${id}`),
    },
    ...Object.fromEntries(sections.map(({ id, element }) => [`request-${id}`, element])),
  }
}

function createRequestsTab(explorerDocks: ExplorerDock[], { requests, selected }: PanelState): Elements {
  return {
    'requests': {
      type: 'Stack',
      props: { direction: 'column', gap: 12, padding: 12 },
      children: ['requests-toolbar', 'requests-table', ...(selected ? ['request-details'] : [])],
    },
    'requests-toolbar': {
      type: 'Stack',
      props: { direction: 'row', align: 'center', justify: 'between', gap: 12, wrap: true },
      children: ['requests-hint', 'requests-actions'],
    },
    'requests-hint': {
      type: 'Text',
      props: { text: 'Shopify requests from server-side rendering, server routes and the browser. Click one to see its details.', variant: 'caption', color: 'muted' },
    },
    'requests-actions': {
      type: 'Stack',
      props: { direction: 'row', align: 'center', gap: 8, wrap: true },
      children: [...explorerDocks.map(({ client }) => `requests-explorer-${client}`), 'requests-clear'],
    },
    ...Object.fromEntries(explorerDocks.map(({ id, client, title }) => [`requests-explorer-${client}`, {
      type: 'Button',
      props: { label: title, icon: 'simple-icons:graphql', variant: 'ghost' },
      on: { press: { action: 'shopify:open-explorer', params: { id } } },
    }])),
    'requests-clear': {
      type: 'Button',
      props: { label: 'Clear', icon: 'ph:trash', variant: 'ghost', disabled: !requests.length },
      on: { press: { action: 'shopify:clear-requests' } },
    },
    'requests-table': {
      type: 'DataTable',
      props: { columns: REQUEST_COLUMNS, rows: requests.map(toRow), height: MAX_HEIGHT, value: { $bindState: '/request' } },
      on: { rowClick: { action: 'shopify:select-request', params: { id: { $state: '/request/row/id' } } } },
    },
    ...(selected ? createRequestDetails(selected, explorerDocks) : {}),
  }
}

function createOperationsTab(operations: Definition[], failures: string[]): Elements {
  return {
    'operations': {
      type: 'Stack',
      props: { direction: 'column', gap: 12, padding: 12 },
      children: ['operations-hint', ...(failures.length ? ['operations-failures'] : []), 'operations-table'],
    },
    'operations-hint': {
      type: 'Text',
      props: { text: 'The GraphQL operations that the type generation found. Click one to open it in your editor.', variant: 'caption', color: 'muted' },
    },
    ...(failures.length
      ? {
          'operations-failures': {
            type: 'Card',
            props: { title: 'Type generation failed' },
            children: ['operations-failures-log'],
          },
          'operations-failures-log': {
            type: 'CodeBlock',
            props: { code: failures.join('\n\n') },
          },
        }
      : {}),
    'operations-table': {
      type: 'DataTable',
      props: { columns: OPERATION_COLUMNS, rows: operations, value: { $bindState: '/operation' } },
      on: { rowClick: { action: 'devframes:service:open:open-in-editor', params: { path: { $state: '/operation/row/path' }, line: { $state: '/operation/row/line' } } } },
    },
  }
}

function createFragmentsTab(fragments: Definition[]): Elements {
  return {
    'fragments': {
      type: 'Stack',
      props: { direction: 'column', gap: 12, padding: 12 },
      children: ['fragments-hint', 'fragments-table'],
    },
    'fragments-hint': {
      type: 'Text',
      props: { text: 'The GraphQL fragments that the type generation found. Click one to open it in your editor.', variant: 'caption', color: 'muted' },
    },
    'fragments-table': {
      type: 'DataTable',
      props: { columns: FRAGMENT_COLUMNS, rows: fragments, value: { $bindState: '/fragment' } },
      on: { rowClick: { action: 'devframes:service:open:open-in-editor', params: { path: { $state: '/fragment/row/path' }, line: { $state: '/fragment/row/line' } } } },
    },
  }
}

function createAnalyticsTab(consentMode: string, { analytics, selectedAnalyticsEvent, consent }: PanelState): Elements {
  return {
    'analytics': {
      type: 'Stack',
      props: { direction: 'column', gap: 12, padding: 12 },
      children: ['analytics-toolbar', 'analytics-consent', 'analytics-table', ...(selectedAnalyticsEvent ? ['analytics-details'] : [])],
    },
    'analytics-toolbar': {
      type: 'Stack',
      props: { direction: 'row', align: 'center', justify: 'between', gap: 12, wrap: true },
      children: ['analytics-hint', 'analytics-clear'],
    },
    'analytics-hint': {
      type: 'Text',
      props: { text: 'The analytics events that tracking receives in the browser, once the visitor allows tracking. Click one to see its payload.', variant: 'caption', color: 'muted' },
    },
    'analytics-clear': {
      type: 'Button',
      props: { label: 'Clear', icon: 'ph:trash', variant: 'ghost', disabled: !analytics.length },
      on: { press: { action: 'shopify:clear-analytics' } },
    },
    'analytics-consent': {
      type: 'KeyValueTable',
      props: {
        data: {
          'Consent mode': consentMode,
          ...(consent?.loaded
            ? Object.fromEntries(CONSENT_CHOICES.map(([key, label]) => [label, consent[key] ? 'Allowed' : 'Not allowed']))
            : { 'Visitor consent': 'Not loaded yet' }),
        },
      },
    },
    'analytics-table': {
      type: 'DataTable',
      props: {
        columns: ANALYTICS_COLUMNS,
        rows: analytics.map(({ id, time, event, page }) => ({ id, time: new Date(time).toLocaleTimeString(), event, page })),
        height: MAX_HEIGHT,
        value: { $bindState: '/analytics' },
      },
      on: { rowClick: { action: 'shopify:select-analytics-event', params: { id: { $state: '/analytics/row/id' } } } },
    },
    ...(selectedAnalyticsEvent
      ? {
          'analytics-details': {
            type: 'Card',
            props: { title: selectedAnalyticsEvent.event },
            children: ['analytics-payload'],
          },
          'analytics-payload': {
            type: 'Tree',
            props: { data: selectedAnalyticsEvent.payload },
          },
        }
      : {}),
  }
}

function createConfigTab(config: ShopifyConfig): Elements {
  return {
    'config': {
      type: 'Stack',
      props: { direction: 'column', gap: 12, padding: 12 },
      children: ['config-tree'],
    },
    'config-tree': {
      type: 'Tree',
      props: {
        data: JSON.parse(JSON.stringify(config, (key, value) => {
          if (SECRET_OPTIONS.has(key)) return value && HIDDEN

          return value?.driver ? { driver: value.driver } : value
        })),
        defaultExpanded: true,
      },
    },
  }
}

export function createPanel(config: ShopifyConfig, explorerDocks: ExplorerDock[], state: PanelState, failures: string[]): JsonRenderSpec {
  const failed = state.requests.filter(request => request.errors).length
  const operations = state.definitions.filter(({ type }) => type !== 'fragment')
  const fragments = state.definitions.filter(({ type }) => type === 'fragment')

  return {
    root: 'tabs',
    elements: {
      tabs: {
        type: 'Tabs',
        props: {
          tabs: [
            {
              value: 'requests',
              label: 'Requests',
              badge: failed ? String(failed) : state.requests.length ? String(state.requests.length) : undefined,
              badgeVariant: failed ? 'danger' : undefined,
            },
            {
              value: 'operations',
              label: 'Operations',
              badge: failures.length ? String(failures.length) : operations.length ? String(operations.length) : undefined,
              badgeVariant: failures.length ? 'danger' : undefined,
            },
            ...(fragments.length ? [{ value: 'fragments', label: 'Fragments', badge: String(fragments.length) }] : []),
            ...(config.analytics ? [{ value: 'analytics', label: 'Analytics', badge: state.analytics.length ? String(state.analytics.length) : undefined }] : []),
            { value: 'config', label: 'Config' },
          ],
        },
        children: ['requests', 'operations', ...(fragments.length ? ['fragments'] : []), ...(config.analytics ? ['analytics'] : []), 'config'],
      },
      ...createRequestsTab(explorerDocks, state),
      ...createOperationsTab(operations, failures),
      ...(fragments.length ? createFragmentsTab(fragments) : {}),
      ...(config.analytics ? createAnalyticsTab(config.analytics.consent.mode, state) : {}),
      ...createConfigTab(config),
    },
  }
}

export async function findDefinitions(nuxt: Nuxt): Promise<Definition[]> {
  const files = [...getDocumentFiles(nuxt)].flatMap(([clientType, paths]) => [...paths].map(path => ({ api: titleCase(clientType), path })))

  const definitions = await Promise.all(files.map(async ({ api, path }) => {
    const code = await readFile(path, 'utf8').catch(() => '')
    const literals = SCHEMA_LANGUAGE_FILE.test(path) ? [{ start: 0, content: code }] : findFileLiterals(path, code)

    return literals.flatMap(({ start, content }) => scanDefinitions(content).map((definition) => {
      const line = code.slice(0, start + definition.start).split('\n').length

      return {
        api,
        name: definition.name ?? 'Anonymous',
        type: definition.text.match(DEFINITION_KEYWORD)?.[0] ?? 'query',
        file: `${relative(nuxt.options.rootDir, path)}:${line}`,
        path,
        line,
      }
    }))
  }))

  return definitions.flat()
}
