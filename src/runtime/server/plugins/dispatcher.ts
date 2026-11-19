import { defineNitroPlugin } from 'nitropack/runtime'

import { setShopifyDispatcher } from '../../utils/clients/fetch'

// Shopify closes or stalls bursts of new connections, so requests queue on a few kept alive ones instead
const MAX_CONNECTIONS = 12

// Node's `fetch` negotiates HTTP/2 from undici 8 on (Node 26). An HTTP/2 stream aborted mid-request can leave the
// process spinning in `Http2Session::SendPendingData` until it runs out of memory, so Shopify requests stay on HTTP/1.1.
// Older Node versions already use HTTP/1.1, and their bundled undici can't take a dispatcher from undici 8
function negotiatesHttp2() {
  const undici = globalThis.process?.versions?.undici

  return !!undici && Number.parseInt(undici) >= 8
}

// Node's `fetch` goes through `HTTP_PROXY` and `HTTPS_PROXY` when this is on, so Shopify requests do too. Like Node, the
// last flag wins, command line flags come after `NODE_OPTIONS`, and a flag overrides `NODE_USE_ENV_PROXY`
function usesEnvProxy() {
  const { env, execArgv } = globalThis.process

  const flag = [...env.NODE_OPTIONS?.split(/\s+/) ?? [], ...execArgv].findLast(arg => arg === '--use-env-proxy' || arg === '--no-use-env-proxy')

  return flag ? flag === '--use-env-proxy' : env.NODE_USE_ENV_PROXY === '1'
}

export default defineNitroPlugin(() => {
  if (!negotiatesHttp2()) return

  setShopifyDispatcher(() => import('undici').then(({ Agent, EnvHttpProxyAgent }) => {
    const options = { allowH2: false, connections: MAX_CONNECTIONS }

    return usesEnvProxy() ? new EnvHttpProxyAgent(options) : new Agent(options)
  }))
})
