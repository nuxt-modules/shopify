export const PAGE_FRAGMENT = `#graphql
  fragment PageFields on Page {
    id
    title
    handle
    body
    bodySummary
    seo {
      title
      description
    }
  }
`
