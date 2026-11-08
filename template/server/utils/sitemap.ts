export const SITEMAP_TYPES = {
  products: 'PRODUCT',
  collections: 'COLLECTION',
  pages: 'PAGE',
  blogs: 'BLOG',
} as const

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll('\'', '&apos;')

export const toXml = (tag: 'sitemapindex' | 'urlset', entries: Array<{ loc: string, lastmod?: string }>) => {
  const item = tag === 'urlset' ? 'url' : 'sitemap'

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${tag} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(({ loc, lastmod }) => `  <${item}><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</${item}>`),
    `</${tag}>`,
  ].join('\n')
}
