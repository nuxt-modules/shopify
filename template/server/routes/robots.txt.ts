const DISALLOWED = [
  '/cart',
  '/account',
  '/checkout',
  '/discount/',
  '/collections/*sort_by*',
  '/*/collections/*sort_by*',
  '/collections/*filter*&*filter*',
  '/*/collections/*filter*&*filter*',
  '/search',
]

export default defineEventHandler((event) => {
  const { origin } = getRequestURL(event)

  setResponseHeaders(event, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': `public, max-age=${60 * 60 * 24}`,
  })

  return [
    'User-agent: *',
    ...DISALLOWED.map(path => `Disallow: ${path}`),
    '',
    'User-agent: adsbot-google',
    'Disallow: /cart',
    'Disallow: /account',
    'Disallow: /search',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
  ].join('\n')
})
