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

export default defineNitroPlugin(() => {
  if (!negotiatesHttp2()) return

  setShopifyDispatcher(() => import('undici').then(({ Agent }) => new Agent({ allowH2: false, connections: MAX_CONNECTIONS })))
})
