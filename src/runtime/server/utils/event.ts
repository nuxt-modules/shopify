import type { H3Event } from 'h3'

import { useEvent } from 'nitropack/runtime'

export function tryUseEvent(): H3Event | undefined {
  try {
    return useEvent()
  }
  catch {
    return undefined
  }
}
