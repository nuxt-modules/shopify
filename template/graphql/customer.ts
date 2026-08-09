export const ADDRESS_FRAGMENT = `#graphql
  fragment AddressFields on CustomerAddress {
    id
    firstName
    lastName
    company
    address1
    address2
    city
    province
    zip
    country
    phoneNumber
    formatted
    territoryCode
    zoneCode
  }
`

export const CUSTOMER_USER_ERRORS_FRAGMENT = `#graphql
  fragment CustomerUserErrorFields on UserErrorsCustomerUserErrors {
    code
    field
    message
  }
`

export const ADDRESS_USER_ERRORS_FRAGMENT = `#graphql
  fragment AddressUserErrorFields on UserErrorsCustomerAddressUserErrors {
    code
    field
    message
  }
`

export const CUSTOMER_FRAGMENT = `#graphql
  fragment CustomerFields on Customer {
    id
    firstName
    lastName
    displayName
    emailAddress {
      emailAddress
    }
    phoneNumber {
      phoneNumber
    }
    defaultAddress {
      ...AddressFields
    }
  }
`

export const ORDER_FRAGMENT = `#graphql
  fragment OrderFields on Order {
    id
    name
    number
    processedAt
    financialStatus
    statusPageUrl
    totalPrice {
      amount
      currencyCode
    }
    lineItems(first: 3) {
      edges {
        node {
          id
          title
          quantity
          image {
            url
            altText
          }
        }
      }
    }
  }
`

export const ORDER_DETAILS_FRAGMENT = `#graphql
  fragment OrderDetailsFields on Order {
    id
    name
    number
    processedAt
    financialStatus
    fulfillmentStatus
    statusPageUrl
    subtotal {
      amount
      currencyCode
    }
    totalTax {
      amount
      currencyCode
    }
    totalShipping {
      amount
      currencyCode
    }
    totalPrice {
      amount
      currencyCode
    }
    shippingAddress {
      ...AddressFields
    }
    billingAddress {
      ...AddressFields
    }
    lineItems(first: 50) {
      edges {
        node {
          id
          title
          variantTitle
          quantity
          image {
            url
            altText
          }
          totalPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`
