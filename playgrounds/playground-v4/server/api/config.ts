import defu from 'defu'

export default defineEventHandler((event) => {
  const { _shopify } = useRuntimeConfig(event)

  return defu({
    clients: {
      admin: {
        clientId: '<admin_client_id>',
        clientSecret: '<admin_client_secret>',
      },
    },
    webhooks: {
      secret: '<webhooks_secret>',
    },
  }, _shopify)
})
