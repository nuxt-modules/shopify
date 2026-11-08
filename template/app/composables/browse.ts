import { normalizeCollectionSearch } from '@shopify/hydrogen'
import { parseURL } from 'ufo'

export const useRouteSearch = () => {
  const route = useRoute()

  return computed(() => normalizeCollectionSearch(parseURL(route.fullPath).search))
}
