<script setup lang="ts">
import { withLeadingSlash } from 'ufo'

definePageMeta({
  redirect: () => {
    if (useCustomerAccountSession().isLoggedIn) {
      return withLeadingSlash(useRuntimeConfig().public._shopify?.clients?.customerAccount?.logoutURL)
    }
    else {
      return '/'
    }
  },
})
</script>
