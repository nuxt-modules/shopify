import { defineNitroPlugin } from 'nitropack/runtime'

import { applyDocumentTrackingHeaders } from '../utils/tracking'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (_response, { event }) => {
    applyDocumentTrackingHeaders(event)
  })
})
