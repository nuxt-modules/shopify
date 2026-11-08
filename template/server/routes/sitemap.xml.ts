export default defineEventHandler(async (event) => {
  const { origin } = getRequestURL(event)
  const storefront = useStorefront(event)

  const sitemaps = await Promise.all(Object.entries(SITEMAP_TYPES).map(async ([path, type]) => {
    const { data } = await storefront.request(`#graphql
      query SitemapPagesCount($type: SitemapType!) {
        sitemap(type: $type) {
          pagesCount {
            count
          }
        }
      }
    `, {
      variables: { type },
    })

    const count = Math.min(data?.sitemap.pagesCount?.count ?? 0, path === 'blogs' ? 1 : Infinity)

    return Array.from({ length: count }, (_, index) => ({
      loc: `${origin}/sitemap/${path}/${index + 1}.xml`,
    }))
  }))

  setResponseHeaders(event, {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': `public, max-age=${60 * 60 * 24}`,
  })

  return toXml('sitemapindex', sitemaps.flat())
})
