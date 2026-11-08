import type { SelectedOption } from '@shopify/hydrogen'
import type { LocationQuery } from 'vue-router'

import { buildProductSelectionSearchParams } from '@shopify/hydrogen'
import { createProductComponents } from '@shopify/hydrogen/vue'

export type ProductFormData = ProductFormFieldsFragment & Required<Pick<ProductFormFieldsFragment, 'selectedOrFirstAvailableVariant'>>

export type ProductFormOptionValue = ReturnType<typeof useProductForm>['options'][number]['values'][number]

export const { ProductProvider, useProduct, useProductForm } = createProductComponents<ProductFormData>()

export const toSearchParams = (query: LocationQuery) => new URLSearchParams(Object.entries(query)
  .flatMap(([name, value]) => [value].flat().map(item => [name, item ?? ''])))

export const productSelectionPath = (path: string, selectedOptions: SelectedOption[], optionNames: string[], query: LocationQuery = {}) => {
  const params = buildProductSelectionSearchParams({ selectedOptions, optionNames, base: toSearchParams(query) })

  return params.size ? `${path}?${params}` : path
}
