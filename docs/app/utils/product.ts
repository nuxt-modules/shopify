import type { SelectedOption } from '@shopify/hydrogen'

import { buildProductSelectionSearchParams } from '@shopify/hydrogen'
import { createProductComponents } from '@shopify/hydrogen/vue'

export type ProductFormData = ProductFormFieldsFragment & Required<Pick<ProductFormFieldsFragment, 'selectedOrFirstAvailableVariant'>>

export const { ProductProvider, useProductForm } = createProductComponents<ProductFormData>()

export const selectionPath = (path: string, selectedOptions: SelectedOption[], optionNames: string[], base: URLSearchParams) => {
  const params = buildProductSelectionSearchParams({ selectedOptions, optionNames, base })

  return params.size ? `${path}?${params}` : path
}
