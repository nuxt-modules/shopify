import { createCartCookie, getCartId } from '@shopify/hydrogen'
import { withQuery } from 'ufo'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code', { decode: true })
  const { redirect, return_to: returnTo, ...query } = getQuery(event)

  const { origin } = getRequestURL(event)
  const target = URL.parse(String(redirect ?? returnTo ?? '/'), origin)
  const location = withQuery(target?.origin === origin && !target.pathname.startsWith('//') ? `${target.pathname}${target.search}` : '/', query)

  if (!code) return sendRedirect(event, location, 303)

  const storefront = useStorefront(event)
  const cartId = getCartId({ cookie: getRequestHeader(event, 'cookie') })
  const { country, language } = event.context.shopifyMarket ?? {}

  const cart = cartId
    ? (await storefront.request(`#graphql
        mutation ApplyDiscountCode($cartId: ID!, $discountCodes: [String!]!) {
          cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
            cart {
              id
            }
          }
        }
      `, {
        variables: { cartId, discountCodes: [code] },
      })).data?.cartDiscountCodesUpdate?.cart
    : (await storefront.request(`#graphql
        mutation CreateDiscountedCart($discountCodes: [String!]!, $country: CountryCode, $language: LanguageCode)
        @inContext(country: $country, language: $language) {
          cartCreate(input: { discountCodes: $discountCodes, buyerIdentity: { countryCode: $country } }) {
            cart {
              id
            }
          }
        }
      `, {
        variables: { discountCodes: [code], country, language },
      })).data?.cartCreate?.cart

  if (cart && !cartId) appendResponseHeader(event, 'set-cookie', createCartCookie(cart.id))

  return sendRedirect(event, location, 303)
})
