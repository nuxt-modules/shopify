export const MENU_ITEM_FRAGMENT = `#graphql
  fragment MenuItemFields on MenuItem {
    title
    url
    resource {
      __typename
      ...on Collection {
        handle
      }
      ...on Product {
        handle
      }
      ...on Blog {
        handle
      }
      ...on Page {
        handle
      }
      ...on Article {
        handle
        blog {
          handle
        }
      }
    }
  }
`

export const MENU_FRAGMENT = `#graphql
  fragment MenuFields on Menu {
    title
    items {
      ...MenuItemFields
    }
  },
`
