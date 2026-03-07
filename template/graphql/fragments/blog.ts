export const ARTICLE_FRAGMENT = `#graphql
    fragment ArticleFields on Article {
        id
        title
        handle
        excerpt
        content
        contentHtml
        publishedAt
    }
`

export const BLOG_FRAGMENT = `#graphql
    fragment BlogFields on Blog {
        id
        title
        articles(first: 10) {
            edges {
                node {
                    ...ArticleFields
                }
            }
        }
    }
    ${ARTICLE_FRAGMENT}
`
