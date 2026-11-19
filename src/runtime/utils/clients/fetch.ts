import type { Dispatcher } from 'undici'

// Shared on `globalThis` since the Vue and Nitro server bundles each get their own copy of this file
const DISPATCHER = Symbol.for('nuxt-shopify:dispatcher')

type DispatcherGlobal = typeof globalThis & { [DISPATCHER]?: () => Promise<Dispatcher | undefined> }

/**
 * Sets the dispatcher Shopify requests go through. It loads on the first request, and requests fall back to the
 * default dispatcher if it fails to load.
 */
export function setShopifyDispatcher(load: () => Promise<Dispatcher>) {
  let dispatcher: Promise<Dispatcher | undefined> | undefined

  (globalThis as DispatcherGlobal)[DISPATCHER] = () => dispatcher ??= load().catch(() => undefined)
}

/**
 * Resolves the dispatcher Shopify requests go through, or `undefined` to use the default one.
 */
export function getShopifyDispatcher(): Promise<Dispatcher | undefined> {
  if (import.meta.client) return Promise.resolve(undefined)

  return (globalThis as DispatcherGlobal)[DISPATCHER]?.() ?? Promise.resolve(undefined)
}

/**
 * The global `fetch`, through the dispatcher set for Shopify requests.
 */
export const shopifyFetch: typeof globalThis.fetch = async (input, init) => {
  const dispatcher = await getShopifyDispatcher()

  return globalThis.fetch(input, dispatcher ? { ...init, dispatcher } as RequestInit : init)
}
