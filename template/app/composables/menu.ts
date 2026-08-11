import { withoutHost } from 'ufo'

export const useMenu = async (handle: string) => {
  const { params: localization } = useLocalization()
  const localePath = useLocalePath()
  const router = useRouter()

  const localizedPath = (url: string) => {
    const path = withoutHost(url)

    return router.resolve(path).matched.length ? localePath(path) : path
  }

  return await useStorefrontData(localizedKey('menu', handle), `#graphql
    query GetNavigation($handle: String!, $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
      menu(handle: $handle) {
        ...MenuFields
      }
    }
  `, {
    variables: computed(() => menuGetInputSchema.parse({
      handle,
      ...localization.value,
    })),
    transform: data => data.menu?.items?.map(item => ({
      label: item.title,
      to: item.resource?.__typename === 'Blog'
        ? localePath(`/blog/${item.resource?.handle}`)
        : item.resource?.__typename === 'Collection'
          ? localePath(`/collection/${item.resource?.handle}`)
          : localizedPath(item.url ?? ''),
    })) ?? [],
    cache: 'long',
  })
}
