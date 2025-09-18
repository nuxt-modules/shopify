export const MENU_FRAGMENT = `#graphql
    fragment MenuFields on Menu {
        title
        items {
            ...MenuItemFields
        }
    }
`

export const MENU_ITEM_FRAGMENT = `#graphql
    fragment MenuItemFields on MenuItem {
        title
        url
    }
`
