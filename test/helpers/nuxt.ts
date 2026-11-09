import type { Resolver } from '@nuxt/kit'

import { vi } from 'vitest'

export const resolver = { resolve: (path: string) => path } as Resolver

export function createSetupNuxt() {
  return {
    options: { dev: false, serverHandlers: [], optimization: { keyedComposables: [] } },
    hook: vi.fn(),
  }
}
