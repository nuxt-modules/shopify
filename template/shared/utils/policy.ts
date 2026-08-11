import type { ShopPoliciesFieldsFragment } from '#shopify/storefront'

export function flattenPolicies(shop?: ShopPoliciesFieldsFragment | null) {
  return [
    shop?.privacyPolicy,
    shop?.refundPolicy,
    shop?.shippingPolicy,
    shop?.termsOfService,
  ].filter(policy => !!policy)
}
