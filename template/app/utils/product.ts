import type { ProductFieldsFragment, ProductVariantFieldsFragment, MoneyV2 } from '#shopify/storefront'

export const isDiscounted = (price: MoneyV2, compareAtPrice?: MoneyV2 | null) => {
  if (!price || !compareAtPrice) return false

  return Number(compareAtPrice.amount) > Number(price.amount)
}

export const discountPercentage = (price: MoneyV2, compareAtPrice?: MoneyV2 | null) => {
  if (!isDiscounted(price, compareAtPrice)) return 0

  const current = Number(price!.amount)
  const original = Number(compareAtPrice!.amount)

  return Math.round(((original - current) / original) * 100)
}

export const hasPriceRange = (product: ProductFieldsFragment) => {
  const { minVariantPrice, maxVariantPrice } = product.priceRange

  return Number(minVariantPrice.amount) !== Number(maxVariantPrice.amount)
}

export const displayPrice = (product: ProductFieldsFragment, variant?: ProductVariantFieldsFragment) => {
  if (variant && !hasPriceRange(product)) return variant.price

  return product.priceRange.minVariantPrice
}

export const displayCompareAtPrice = (product: ProductFieldsFragment, variant?: ProductVariantFieldsFragment) => {
  if (variant && !hasPriceRange(product)) return variant.compareAtPrice

  const compareAt = product.compareAtPriceRange?.minVariantPrice

  return isDiscounted(product.priceRange.minVariantPrice, compareAt) ? compareAt : undefined
}

export const isSoldOut = (product: ProductFieldsFragment) => !product.availableForSale

export const hasSellingPlans = (product: ProductFieldsFragment) =>
  flattenConnection(product.sellingPlanGroups).length > 0

export const isLowStock = (variant?: ProductVariantFieldsFragment, threshold = 5) => {
  if (!variant) return false

  const quantity = variant.quantityAvailable

  if (quantity === null || quantity === undefined || quantity < 0) return false

  return variant.availableForSale && quantity > 0 && quantity <= threshold
}
