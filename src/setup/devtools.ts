import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { DevToolsViewJsonRender } from '@vitejs/devtools/json-render'

import type { ShopifyDevtoolsAnalyticsEvent, ShopifyDevtoolsConsent, ShopifyDevtoolsRequest } from '../runtime/utils/devtools'
import type { ShopifyClientType } from '../schemas'
import type { ShopifyConfig } from '../types'
import type { PanelState } from '../utils/devtools'

import { addNitroPlugin, addPlugin, hasNuxtModuleCompatibility } from '@nuxt/kit'
import { kebabCase, titleCase } from 'scule'
import { joinURL } from 'ufo'

import { DEVTOOLS_ANALYTICS_EVENT, DEVTOOLS_CHANNEL, DEVTOOLS_CONSENT_EVENT, DEVTOOLS_EVENT } from '../runtime/utils/devtools'
import { getConfiguredClients } from '../utils/clients'
import { getGenerateFailures } from '../utils/codegen'
import { onDevServerURL } from '../utils/dev'
import { createPanel, findDefinitions } from '../utils/devtools'
import { registerExplorer, shouldEnableExplorer } from '../utils/explorer'
import { useLogger } from '../utils/log'

const MAX_ENTRIES = 100

export default function setupDevtools(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  if (!nuxt.options.dev) return

  const logger = useLogger()
  const explorers = new Map<ShopifyClientType, string>()

  for (const { clientType } of getConfiguredClients(config)) {
    if (shouldEnableExplorer(nuxt, config, clientType)) {
      const path = registerExplorer(resolver, config, clientType)

      explorers.set(clientType, path)

      onDevServerURL(nuxt, origin =>
        logger.info(`The ${kebabCase(clientType)} explorer is available at ${joinURL(origin, path)}`),
      )
    }
  }

  if (!config.devtools) return

  nuxt.hook('modules:done', async () => {
    if (!await hasNuxtModuleCompatibility('@nuxt/devtools', '>=4.0.0', nuxt)) return

    addNitroPlugin(resolver.resolve('./runtime/server/plugins/devtools'))
    addPlugin({ src: resolver.resolve('./runtime/plugins/devtools'), mode: 'server' })
    addPlugin({ src: resolver.resolve('./runtime/plugins/devtools.client'), mode: 'client' })

    const { NUXT_DEVTOOLS_GROUP_ID, onDevtoolsReady } = await import('@nuxt/devtools-kit')

    const explorerDocks = [...explorers].map(([clientType, url]) => ({
      id: `shopify:${kebabCase(clientType)}-explorer`,
      client: kebabCase(clientType),
      title: `${titleCase(clientType)} API`,
      url,
    }))

    onDevtoolsReady((context) => {
      const state: PanelState = { requests: [], definitions: [], analytics: [] }

      const panel = context.createJsonRenderer(createPanel(config, explorerDocks, state, getGenerateFailures(nuxt)))
      const dock = context.docks.register<DevToolsViewJsonRender>({ id: 'shopify', title: 'Shopify', icon: 'simple-icons:shopify', type: 'json-render', view: panel.view, groupId: NUXT_DEVTOOLS_GROUP_ID, category: 'modules' })
      const channel = new BroadcastChannel(DEVTOOLS_CHANNEL)

      for (const { id, title, url } of explorerDocks) {
        context.docks.register({ id, title, icon: 'simple-icons:graphql', type: 'iframe', url, groupId: NUXT_DEVTOOLS_GROUP_ID, category: 'modules' })
      }

      const render = () => {
        const failed = state.requests.filter(request => request.errors).length

        panel.updateSpec(createPanel(config, explorerDocks, state, getGenerateFailures(nuxt)))
        dock.update({ badge: failed ? String(failed) : undefined, badgeVariant: 'danger' })
      }

      const refreshDefinitions = () => findDefinitions(nuxt).then((definitions) => {
        state.definitions = definitions
        render()
      })

      const { rpc } = context.scope('shopify')

      rpc.register({
        name: 'select-request',
        type: 'action',
        handler: ({ id }: { id: number }) => {
          state.selected = state.requests.find(request => request.id === id)
          render()
        },
      })

      rpc.register({
        name: 'open-explorer',
        type: 'action',
        handler: ({ id }: { id: string }) => context.docks.activate(id),
      })

      rpc.register({
        name: 'clear-requests',
        type: 'action',
        handler: () => {
          state.requests = []
          state.selected = undefined
          render()
        },
      })

      rpc.register({
        name: 'select-analytics-event',
        type: 'action',
        handler: ({ id }: { id: number }) => {
          state.selectedAnalyticsEvent = state.analytics.find(event => event.id === id)
          render()
        },
      })

      rpc.register({
        name: 'clear-analytics',
        type: 'action',
        handler: () => {
          state.analytics = []
          state.selectedAnalyticsEvent = undefined
          render()
        },
      })

      let lastId = 0

      const addRequest = (request: ShopifyDevtoolsRequest) => {
        state.requests = [{ ...request, id: ++lastId }, ...state.requests].slice(0, MAX_ENTRIES)
        render()
      }

      const addAnalyticsEvent = (event: ShopifyDevtoolsAnalyticsEvent) => {
        state.analytics = [{ ...event, id: ++lastId }, ...state.analytics].slice(0, MAX_ENTRIES)
        render()
      }

      const setConsent = (consent: ShopifyDevtoolsConsent) => {
        state.consent = consent
        render()
      }

      channel.onmessage = ({ data }: MessageEvent<ShopifyDevtoolsRequest>) => addRequest(data)

      context.viteServer?.ws.on(DEVTOOLS_EVENT, addRequest)
      context.viteServer?.ws.on(DEVTOOLS_ANALYTICS_EVENT, addAnalyticsEvent)
      context.viteServer?.ws.on(DEVTOOLS_CONSENT_EVENT, setConsent)

      refreshDefinitions()

      nuxt.hook('app:templatesGenerated', () => void refreshDefinitions())
      nuxt.hook('builder:watch', () => void refreshDefinitions())
      nuxt.hook('close', () => channel.close())
    }, nuxt)
  })
}
