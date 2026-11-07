import type { ShopifyScriptTagsOptions } from '@shopify/hydrogen'

export type ShopifyScriptsShopContext = Required<Pick<ShopifyScriptTagsOptions, 'shop' | 'shopifyAnalytics'>> & Pick<ShopifyScriptTagsOptions, 'i18n'>
