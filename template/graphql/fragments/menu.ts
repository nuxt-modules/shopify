export const MENU_ITEM_FRAGMENT = `#graphql
    fragment MenuItemFields on MenuItem {
        title
        url
        resource {
            ...on Collection {
                __typename
                handle
            }
            ...on Blog {
                __typename
                handle
            }
            ...on Page {
                __typename
                handle
            }
            ...on Article {
                __typename
                handle
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
    ${MENU_ITEM_FRAGMENT}
`
