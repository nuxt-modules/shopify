<script setup lang="ts">
import { withLeadingSlash } from 'ufo'

definePageMeta({
  redirect: () => {
    if (useCustomerAccountSession().isLoggedIn) {
      return '/account'
    }
    else {
      return withLeadingSlash(useRuntimeConfig().public._shopify?.clients?.customerAccount?.loginURL)
    }
  },
})
</script>
