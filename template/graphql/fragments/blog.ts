export const ARTICLE_FRAGMENT = `#graphql
    fragment ArticleFields on Article {
        id
        title
        handle
        excerpt
        content
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
                    ...ArticleFields
                }
            }
        }
        seo {
            title
            description
        }
    }
    ${ARTICLE_FRAGMENT}
`
