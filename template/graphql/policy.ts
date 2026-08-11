export const POLICY_FRAGMENT = `#graphql
  fragment PolicyFields on ShopPolicy {
    id
    title
    handle
    body
  }
`

export const SHOP_POLICIES_FRAGMENT = `#graphql
  fragment ShopPoliciesFields on Shop {
    privacyPolicy {
      ...PolicyFields
    }
    refundPolicy {
      ...PolicyFields
    }
    shippingPolicy {
      ...PolicyFields
    }
    termsOfService {
      ...PolicyFields
    }
  }
`
