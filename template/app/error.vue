<script setup lang="ts">
import type { NuxtError } from '#app'

import * as locales from '@nuxt/ui/locale'

const props = defineProps<{
  error: NuxtError
}>()

const { shopify: { shopName } } = useAppConfig()
const { language } = useLocalization()
const { get } = useCart()
const localePath = useLocalePath()

const lang = computed(() => locales[language.value].code)
const dir = computed(() => locales[language.value].dir)

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
  title: shopName,
})

await callOnce('shopify-cart', get)
</script>

<template>
  <UApp :locale="locales[language]">
    <NuxtLayout>
      <UError
        :error="props.error"
        :clear="false"
      >
        <template #links>
          <UButton
            @click="clearError({
              redirect: localePath('/'),
            })"
          >
            {{ $t('error.home') }}
          </UButton>
        </template>
      </UError>
    </NuxtLayout>
  </UApp>
</template>
