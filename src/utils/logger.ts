import { useLogger } from '@nuxt/kit'

export { LogLevels } from 'consola'

const logger = useLogger('nuxt-shopify', {
    defaults: {
        message: '[shopify]',
    },
})

export default logger
