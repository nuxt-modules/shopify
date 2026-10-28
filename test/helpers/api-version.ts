import { getCurrentSupportedApiVersions } from '@shopify/graphql-client'

import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'

const versions = getCurrentSupportedApiVersions()
  .filter(version => version !== DEFAULT_API_VERSION && version !== 'unstable')

export const API_VERSION = versions[0]!

export const OTHER_API_VERSION = versions[1]!
