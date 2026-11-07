import type {
  ConsentConfig,
  ShopifyScriptsOptions,
  ShopifyScriptTagDescriptors,
} from '@shopify/hydrogen'

import type { useHead, useRouter } from '#imports'
import type { PublicShopifyConfig, ShopifyScriptsShopContext } from '../../../module'

type HeadInput = Parameters<typeof useHead>[0]

const SHOPIFY_SCRIPTS_PRIORITY = 50

export function toScriptsOptions({ shop, i18n, shopifyAnalytics }: ShopifyScriptsShopContext, storefrontId: PublicShopifyConfig['storefrontId'], consent: ConsentConfig): ShopifyScriptsOptions {
  return {
    shop,
    ...(i18n ? { i18n } : {}),
    consent,
    shopifyAnalytics,
    analytics: { channel: storefrontId ? 'hydrogen' : 'headless' },
  }
}

export function toScriptsHead({ links, scripts }: ShopifyScriptTagDescriptors): HeadInput {
  return {
    link: links.map(link => ({ ...link.attributes, key: link.attributes.href })),
    script: scripts.map(script => ({
      ...script.attributes,
      key: script.attributes?.id,
      innerHTML: script.innerHTML,
      tagPriority: SHOPIFY_SCRIPTS_PRIORITY,
    })),
  } as HeadInput
}

export function createNavigation(router: Pick<ReturnType<typeof useRouter>, 'push'>) {
  return (url: string) => {
    const target = new URL(url, window.location.href)

    if (target.origin !== window.location.origin) return window.location.assign(target.href)

    return router.push(target.pathname + target.search + target.hash).then(() => undefined)
  }
}
