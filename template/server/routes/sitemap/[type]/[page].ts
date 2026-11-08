export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'type') ?? ''
  const page = Number.parseInt(getRouterParam(event, 'page') ?? '', 10)

  if (!Object.hasOwn(SITEMAP_TYPES, path) || !(page >= 1) || (path === 'blogs' && page > 1)) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }

  const { origin } = getRequestURL(event)
  const storefront = useStorefront(event)

  const entries = path === 'blogs'
    ? await storefront.request(`#graphql
        query SitemapBlogs {
          blogs(first: 250) {
            nodes {
              handle
              articles(first: 250) {
                nodes {
                  handle
                  publishedAt
                }
              }
            }
          }
        }
      `).then(({ data }) => (data?.blogs.nodes ?? []).flatMap(blog => [
        { loc: `${origin}/blogs/${blog.handle}` },
        ...blog.articles.nodes.map(article => ({ loc: `${origin}/blogs/${blog.handle}/${article.handle}`, lastmod: article.publishedAt })),
      ]))
    : await storefront.request(`#graphql
        query SitemapResources($type: SitemapType!, $page: Int!) {
          sitemap(type: $type) {
            resources(page: $page) {
              items {
                handle
                updatedAt
              }
            }
          }
        }
      `, {
        variables: { type: SITEMAP_TYPES[path as keyof typeof SITEMAP_TYPES], page },
      }).then(({ data }) => (data?.sitemap.resources?.items ?? []).map(({ handle, updatedAt }) => ({
        loc: `${origin}/${path}/${handle}`,
        lastmod: updatedAt,
      })))

  setResponseHeaders(event, {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': `public, max-age=${60 * 60 * 24}`,
  })

  return toXml('urlset', entries)
})
