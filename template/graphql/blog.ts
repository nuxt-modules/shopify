export const ARTICLE_FRAGMENT = `#graphql
  fragment ArticleFields on Article {
    id
    title
    handle
    excerpt
    contentHtml
    publishedAt
    seo {
      title
      description
    }
  }
`

export const BLOG_FRAGMENT = `#graphql
  fragment BlogFields on Blog {
    id
    title
    articles(first: 250) {
      edges {
        node {
          id
          title
          handle
          excerpt
          publishedAt
        }
      }
    }
    seo {
      title
      description
    }
  }
`
