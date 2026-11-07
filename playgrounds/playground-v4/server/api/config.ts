import defu from 'defu'

export default defineEventHandler((event) => {
  const { _shopify, public: { _shopify: publicShopify } } = useRuntimeConfig(event)

  return defu(publicShopify, {
    clients: {
      admin: {
        apiVersion: _shopify?.clients.admin?.apiVersion,
      },
    },
  })
})
