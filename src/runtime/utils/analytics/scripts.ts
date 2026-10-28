import type {
  ConsentConfig,
  ShopifyScriptsI18n,
  ShopifyScriptsOptions,
  ShopifyScriptTagDescriptors,
} from '@shopify/hydrogen'

import type { useHead, useRouter } from '#imports'
import type { PublicShopifyConfig } from '../../../module'
import type { ShopifyScriptsShopContext } from './shop'

type AnalyticsConfig = Exclude<PublicShopifyConfig['analytics'], false>

type Router = ReturnType<typeof useRouter>

type HeadInput = Parameters<typeof useHead>[0]

const SHOPIFY_SCRIPTS_PRIORITY = 50

export function toScriptsOptions({ shop, i18n }: ShopifyScriptsShopContext, analytics: AnalyticsConfig, consent: ConsentConfig): ShopifyScriptsOptions {
  return {
    shop,
    ...(i18n ? { i18n } : {}),
    consent,
    analytics: { channel: analytics.storefrontId ? 'hydrogen' : 'headless' },
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

export function applyMarket({ country, language, currency }: ShopifyScriptsI18n) {
  const shopify = window.Shopify

  if (!shopify) return

  const locale = language.toLowerCase()

  shopify.country = country
  shopify.locale = locale

  if (currency) shopify.currency = { active: currency.toUpperCase() }

  shopify.components = { ...shopify.components, config: { ...shopify.components?.config, country, language: locale } }
}

export function createNavigation(router: Pick<Router, 'push'>) {
  return (url: string) => {
    const target = new URL(url, window.location.href)

    if (target.origin !== window.location.origin) return window.location.assign(target.href)

    return router.push(target.pathname + target.search + target.hash).then(() => undefined)
  }
}
