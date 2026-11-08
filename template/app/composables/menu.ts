import { hasProtocol, parseURL, withoutHost } from 'ufo'

type MenuResource = NonNullable<MenuItemFieldsFragment['resource']>

const resourcePath = (resource: MenuResource) => {
  switch (resource.__typename) {
    case 'Collection': return `/collections/${resource.handle}`
    case 'Product': return `/products/${resource.handle}`
    case 'Page': return `/pages/${resource.handle}`
    case 'Blog': return `/blogs/${resource.handle}`
    case 'Article': return `/blogs/${resource.blog.handle}/${resource.handle}`
  }
}

export const useMenu = async (handle: string) => {
  const { params: localization } = useLocalization()
  const localePath = useLocalePath()
  const router = useRouter()

  const localizedPath = (url: string, shopHost: string) => {
    const { protocol, host } = parseURL(url)

    if (hasProtocol(url) && !(/^https?:$/.test(protocol ?? '') && (host === shopHost || host?.endsWith('.myshopify.com')))) return url

    const path = withoutHost(url)

    return router.resolve(path).matched.length ? localePath(path) : path
  }

  return await useStorefrontData(localizedKey('menu', handle), `#graphql
    query GetNavigation($handle: String!, $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
      shop {
        primaryDomain {
          host
        }
      }
      menu(handle: $handle) {
        ...MenuFields
      }
    }
  `, {
    variables: computed(() => menuGetInputSchema.parse({
      handle,
      ...localization.value,
    })),
    transform: data => data.menu?.items?.map((item) => {
      const path = item.resource && resourcePath(item.resource)

      return {
        label: item.title,
        to: path ? localePath(path) : localizedPath(item.url ?? '', data.shop.primaryDomain.host),
      }
    }) ?? [],
    cache: 'long',
  })
}
